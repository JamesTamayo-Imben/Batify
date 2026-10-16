# Batify 🎈 — Send a greeting that stays.
*Bati na, may pa-gift pa.* · Birthday letters, wishes & gifts — one link, no signup.

A static React SPA + Supabase (Postgres, Storage, Edge Functions). No accounts: the
private **edit link is the credential**.

## Stack
Vite + React 18 (JSX) · React Router 6 · Tailwind CSS · vite-plugin-pwa · Supabase · Cloudflare Turnstile · Google AdSense

## 1. Setup
```bash
npm install
cp .env.local.example .env.local   # fill in the values
```
1. **Supabase project** → create at supabase.com. Copy Project URL + anon key into `.env.local`.
2. **Database** → SQL editor → paste all of `schema.sql` → Run. (Tables, RLS, column grants, realtime, storage buckets.)
3. **Turnstile** → Cloudflare dashboard → Turnstile → add your domain (+ `localhost`). Site key → `VITE_TURNSTILE_SITE_KEY`; secret key → step 4.
   With no site key set, dev uses Cloudflare's always-pass *test* key (server must then use the matching test secret `1x0000000000000000000000000000000AA`).
4. **Edge function secrets & deploy**
```bash
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase login --project-ref <your-ref>
supabase secrets set TURNSTILE_SECRET_KEY=<turnstile-secret>
supabase secrets set ADMIN_SECRET=<long-random-string-16+chars>   # super admin
supabase functions deploy create-page send-wish manage-page admin
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. `verify_jwt = false` is set in `supabase/config.toml`.

## 2. Run locally
```bash
npm run dev          # http://localhost:5173  (service worker is production-only)
npm run build && npm run preview   # test the PWA
```

## 3. Deploy the frontend
- **Vercel**: import repo, framework *Vite*, add the `VITE_*` env vars. `vercel.json` handles SPA fallback.
- **Netlify / Cloudflare Pages**: build `npm run build`, publish `dist`. `public/_redirects` handles SPA fallback.

## 4. AdSense
- Put your publisher ID in `VITE_ADSENSE_CLIENT` (`ca-pub-…`). The loader `<script>` is injected into `<head>` at build time only if set; `<AdSlot>` renders nothing if unset.
- Create display ad units and set `VITE_ADSENSE_SLOT_HOME / _CREATE / _PUBLIC`.
- Placement: Home (below fold) · Create (very bottom) · Public page (very bottom, after the send form + GCash) · **Dashboard/Admin: none**. Never inside the send card or beside media.
- Add `ads.txt` to `public/` once approved.

## 5. Super admin
Open `/admin`, enter `ADMIN_SECRET`. Overview stats, search/unpublish/delete pages, copy a page's edit link (the only edit-link *recovery* path — for owner support), moderate wishes and reports, verify GCash payments.

## Decisions I made (you said not to ask)
- **Edge functions**: `send-wish` is multipart and has three modes — `wish` (default), `contribution` (sender's GCash screenshot), `report` — so every public write is Turnstile-verified in one place. A 4th function, `admin`, backs the super-admin role.
- **Schema additions**: `contributions.sender_name`; `contributions.wish_id` is nullable (GCash can be sent without a wish).
- **`edit_token` protection**: RLS filters rows, not columns, so `schema.sql` revokes table privileges and grants anon `SELECT` only on safe `pages` columns. The client therefore never uses `select('*')` on `pages`.
- **True time-lock**: the wishes RLS policy also requires the page's `reveal_at` to have passed — the lock holds even against direct REST calls, not just in the UI.
- **Payment screenshots** go to a **private** `payment-proofs` bucket; the owner sees short-lived signed URLs. Gift media and GCash QR use the public `wish-media` bucket per spec.
- **Uploads** are validated by magic bytes (not just `file.type`); SVG is never accepted.
- **`manage-page`** is not Turnstile-gated (the 32-char token is the credential; rate-limited per IP instead). Everything else public is.
- Local "My page" list stores edit tokens in your browser's localStorage only (convenience; "Forget" removes them).
- Wishes realtime also listens to `UPDATE`, so a wish appears live the moment the owner approves it.

## Known limitations
- **No edit-link recovery** for owners (only the super admin can look one up).
- **GCash is manual**: QR/number + screenshot, the owner confirms by hand. No payment API, no fraud checks.
- **Rate limiting is in-memory per edge isolate** — best-effort. For production use Upstash Redis (INCR+EXPIRE) or a Postgres `rate_limits` table.
- Service worker caches media with Cache-First for 30 days; deleted media may linger in a visitor's cache.
- Edit tokens appear in URLs (browser history). Treat edit links like passwords.
- Icons are simple generated placeholders — replace `public/icons/*` and `favicon.svg` with final brand art.
- Not built/run in this environment (no network for `npm install`): run `npm run build` once and fix anything your toolchain flags.
