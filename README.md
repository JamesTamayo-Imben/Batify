<div align="center">

# Batify

### Birthday letters, wishes, and gifts in one link.

**Bati na, may pa-gift pa.**

[Try Batify](https://batify.site.je) · [Deployment](#deployment) · [License](LICENSE)

</div>

Batify lets someone write a birthday letter, share one link, and receive wishes
and gifts from friends. It is a static React application backed by Supabase:
there are no user accounts, and a private edit link is the page owner's
credential.

> **License:** Batify's original source code and visual design are proprietary.
> Do not copy or reuse the design without prior written permission. See
> [LICENSE](LICENSE) for the full terms. Third-party components and fonts retain
> their own licenses.

## At a glance

| Area | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS |
| Data and backend | Supabase Postgres, Storage, Realtime, Edge Functions |
| Abuse prevention | Cloudflare Turnstile |
| Motion and illustration | CSS 3D transforms, inline SVG, canvas confetti |
| Tests | Vitest, Testing Library, jsdom |
| Production site | [batify.site.je](https://batify.site.je) |

## Product features

- A guided, four-step birthday letter creator with a live preview and autosaved
  draft.
- A sealed-envelope opening experience and responsive birthday page.
- Birthday wishes presented as gift boxes, with individual and bulk
  wrap/unwrap controls.
- Optional reveal scheduling, wish moderation, photo/video gifts, GCash details,
  and QR-code sharing.
- Seasonal Christmas pamasko, Valentine's Day, and anniversary gift links with
  recurring campaign schedules and admin-managed suggested gifts.
- A lightweight owner dashboard for page activity and wish management.
- A progressive web app with reduced-motion support and accessible controls.

## Getting started

### Requirements

- Node.js and npm.
- A Supabase project.
- A Cloudflare Turnstile widget for the domains where the app will run.

### Install

```powershell
npm install
Copy-Item .env.local.example .env.local
```

On macOS or Linux, use `cp .env.local.example .env.local` instead of
`Copy-Item`.

Edit `.env.local` and provide the values described in
[Environment variables](#environment-variables).

### Configure Supabase

1. In the Supabase SQL Editor, run [`schema.sql`](schema.sql). It creates the
   application tables, row-level security policies, column grants, storage
   buckets, supporting functions, and the seasonal campaign configuration.
2. In the Supabase project, allow the app's production hostname in the settings
   required by your project and ensure the required tables are available through
   the API.
3. Install and authenticate the Supabase CLI, link this repository to the
   project, configure the server-side secrets, and deploy the Edge Functions:

   ```powershell
   npm install --global supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set TURNSTILE_SECRET_KEY=<turnstile-secret>
   supabase secrets set ADMIN_SECRET=<long-random-secret>
   supabase functions deploy create-page send-wish manage-page admin track-open
   ```

   Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into Edge
   Functions. The service-role key belongs on the server only; never place it in
   `.env.local` or any `VITE_*` variable.

4. Add each production hostname to Cloudflare Turnstile Hostname Management.
   For the current production site, add `batify.site.je`. Add `www.batify.site.je`
   only if you intend to serve the app from that hostname too. Set the
   corresponding **site key** in `VITE_TURNSTILE_SITE_KEY` and the matching
   **secret key** in Supabase as `TURNSTILE_SECRET_KEY`.

   During local development, the app can use Turnstile's documented test keys.
   Use the matching test secret in local Supabase function secrets; never use
   test keys for production.

### Run locally

```powershell
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). To test a
production build, run each command after the previous one succeeds:

```powershell
npm run build
npm run preview
```

The service worker is enabled in production builds, not in the Vite development
server.

Seasonal campaign pages use the same shareable wish links as birthday pages.
The admin console's **Campaigns** tab controls recurring MM-DD date windows,
titles, descriptions, enablement, and suggested gift labels. Campaigns activate
automatically inside their configured window using Philippine time. Re-run
`schema.sql` on existing projects before deploying the updated Edge Functions
and frontend; it safely adds the campaign table and page occasion column.

## Environment variables

The client template is [`.env.local.example`](.env.local.example). Copy it to
`.env.local` and configure:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase publishable/anon key. |
| `VITE_TURNSTILE_SITE_KEY` | Public Turnstile site key for the deployed hostname. |
| `VITE_SITE_URL` | Canonical site URL used for absolute social metadata; production is `https://batify.site.je`. |
| `VITE_ADSENSE_CLIENT` | Optional AdSense publisher ID. |
| `VITE_ADSENSE_SLOT_HOME` | Optional AdSense slot for the home page. |
| `VITE_ADSENSE_SLOT_CREATE` | Optional AdSense slot for the create page. |
| `VITE_ADSENSE_SLOT_PUBLIC` | Optional AdSense slot for public birthday pages. |

Vite embeds `VITE_*` values in browser assets. Only use public values in these
variables. **Never use a Supabase secret/service-role key, Turnstile secret, or
`ADMIN_SECRET` in a `VITE_*` variable.** The build rejects a Supabase key with
the `sb_secret_` prefix.

`.env.local` is ignored by Git; do not upload it to web hosting or commit it.

The Turnstile site key must authorize the hostname currently serving the app.
The example key is for `batify.site.je`; when developing on `localhost` or
`127.0.0.1`, use a key authorized for that hostname and a backend configured
with its matching secret. Do not remove the CAPTCHA token requirement from
submit buttons to work around a hostname error.

## Deployment

Build the static frontend locally:

```powershell
npm run build
```

The deployable files are written to `dist/`. Deploy the contents of that
directory, not the repository or the `dist` directory itself.

### InfinityFree — `batify.site.je`

1. Ensure `.env.local` has `VITE_SITE_URL=https://batify.site.je`, the correct
   Supabase public values, and the Turnstile site key authorized for
   `batify.site.je`.
2. Run `npm run build`.
3. Upload **all contents** of `dist/`, including hidden files such as
   `.htaccess`, to the domain's `htdocs` directory using InfinityFree File
   Manager or FTP. Do not upload `.env.local`, `node_modules`, or the source
   repository.
4. Enable HTTPS for the domain, then test both `https://batify.site.je/` and a
   direct app route such as `https://batify.site.je/p/<slug>`.

The Apache fallback in [`public/.htaccess`](public/.htaccess) is copied into
`dist/` and serves the React app for client-side routes. Supabase and its Edge
Functions remain hosted on Supabase. The Vercel-only `api/p.js` endpoint does
not run on InfinityFree, so social crawlers receive generic link metadata.

### Other static hosts

- **Vercel:** deploy the Vite project with the required `VITE_*` build
  variables. [`vercel.json`](vercel.json) configures SPA routing and crawler
  link previews. Configure the server-only `SUPABASE_URL` and
  `SUPABASE_ANON_KEY` for the preview endpoint separately.
- **Netlify / Cloudflare Pages:** run `npm run build`, publish `dist`, and use
  the included [`public/_redirects`](public/_redirects) SPA fallback.

Hosting providers may require different SPA rewrite rules. Verify direct
navigation to nested routes after deployment.

## Security and data handling

- The browser client is read-only under row-level security. Public writes go
  through Supabase Edge Functions.
- The `edit_token` is a bearer credential: anyone with the edit link can manage
  that page. Treat it like a password and avoid sharing it publicly.
- Anonymous page reads use an explicit safe-column list; the edit token is not
  selectable by the public client.
- Wish reads are protected by database policies as well as the UI. Scheduled
  wishes remain hidden until their reveal time.
- Payment proof images are stored in a private bucket and shown to the owner
  through short-lived signed URLs. Public gift media and GCash QR images use the
  public media bucket.
- Uploads are checked by file signature, and SVG uploads are not accepted.
- The super-admin interface is at `/admin` and requires the server-configured
  `ADMIN_SECRET`.

Review the schema, Edge Functions, and hosting configuration before using the
app with real user data.

## Optional: Google AdSense

AdSense is disabled unless `VITE_ADSENSE_CLIENT` is set. To enable it, configure
the publisher ID and the optional slot IDs in `.env.local`, then rebuild. Ads
are placed below the main content on the home, create, and public page views;
they are not placed inside the wish form or dashboard.

## Development and tests

Run the test suite with:

```powershell
npm test
```

Tests cover the envelope interaction state, countdown, storage helpers, gift
box state, wish wrapping, and project-level content rules.

Build the production bundle with `npm run build`. For device-specific behavior,
also check the envelope and gift interactions on actual mobile browsers and
devices.

## Known limitations

- Social previews with per-page titles require the Vercel serverless endpoint;
  other static hosts use generic metadata.
- Edit links cannot be recovered by page owners. The super-admin can retrieve
  an edit link for support purposes.
- GCash payments are manual: the recipient checks the payment and confirms it.
  There is no payment processor integration or automated fraud review.
- Rate limiting uses a shared database-backed limiter with an in-memory
  fallback if the database call fails; the fallback is best-effort across
  serverless instances.
- The service worker caches media for up to 30 days, so deleted media may
  remain in a visitor's cache until it expires or is cleared.
- The interface has not been verified on every mobile browser or low-end
  device. Validate it against the devices you intend to support.

## License

Batify's original source code and visual design are proprietary. All rights are
reserved; copying, adapting, or reusing the design requires prior written
permission. Third-party dependencies, fonts, and other third-party materials
remain under their own licenses. See [`LICENSE`](LICENSE) for the complete
terms.
