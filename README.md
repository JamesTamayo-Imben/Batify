<div align="center">

# Batify

### A letter worth opening. A little love worth sharing.

**Bati na, may pa-gift pa.**

[Open Batify](https://batify.site.je) · [How it works](#how-batify-works) · [Run locally](#run-locally) · [License](LICENSE)

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![Vite 5](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Proprietary license](https://img.shields.io/badge/license-Proprietary-C92F20)](LICENSE)

</div>

> Create a celebration page, seal a personal letter, and share one link for
> friends to leave wishes and virtual gifts. Batify is built for fun and
> appreciation, not spending: no real gift or money is required.

## How Batify works

1. **Make it personal.** Write a birthday or special-event letter, choose a
   theme, and seal it in a digital envelope.
2. **Share one link.** Friends can leave a message and choose a virtual gift.
3. **Open the moment.** The page owner manages the page and wishes from a
   private edit link; event pages open and expire on schedule.

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
  draft, seven curated palettes, and a custom color picker that derives a
  matching palette. **Dahon** is Batify's natural theme, with fresh green and
  forest tones.
- A sealed-envelope opening experience and responsive birthday page.
- Birthday wishes presented as gift boxes, with individual and bulk
  wrap/unwrap controls.
- Eight gift choices for wishes: flowers, teddy bears, chocolate, cake, coffee,
  books, balloons, and photos or videos.
- Optional reveal scheduling, wish moderation, photo/video gifts, GCash details,
  and QR-code sharing.
- Public birthday and anniversary pages expire at midnight (Asia/Manila) 30
  days after their date. Seasonal pages expire at midnight after the campaign
  ends; owners and admins retain access to expired pages.
- Christmas, Halloween, Valentine's Day, and New Year links become available
  during the 30-day lead-in and open on the event date. Anniversary links remain
  available year-round; all new special-event letters stay sealed until their
  chosen date.
- Priority seasonal campaigns switch the whole site to their event colors and
  decorations during their configured Philippine-time window. Christmas wins
  when its window overlaps New Year; Anniversary is never a priority event.
  The Home hero and seasonal letters use event illustrations as their opening
  controls, with optional motion-sensor shake support where available. The
  Home page offers a browser-local Anniversary preview year-round and priority
  previews when their configured campaign is not already active. Active-event
  cards let visitors switch to that event's theme on their device; previews do
  not change event scheduling. Christmas uses falling branched snowflakes, a locally
  served audio track at 12% volume with a play/pause control, and Christmas
  Day as the default letter date. Browser autoplay restrictions may require
  visitors to start the audio manually.
- A lightweight owner dashboard for page activity and wish management.
- A local-only activity history for opened letters and future write, create, send,
  and report actions. It stores no letter or message contents and does not sync.
- A browser install prompt where supported, with platform-specific home-screen
  guidance when the browser requires a manual install.
- Coarse device, browser, and operating-system categories in admin records.
  Existing rows are labeled Unknown because historical device details cannot be
  reconstructed.
- Dedicated About Batify, developer story, Contact, How it works, and FAQ pages
  linked from the responsive footer.
- A progressive web app with reduced-motion support and accessible controls.

## Contents

- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Security and data handling](#security-and-data-handling)
- [Development and tests](#development-and-tests)
- [Known limitations](#known-limitations)
- [License](#license)

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

1. In the Supabase SQL Editor, run or re-run [`schema.sql`](schema.sql). It
   creates and updates the application tables, row-level security policies,
   column grants, storage buckets, supporting functions, and seasonal campaign
   configuration. It also creates the private `wish-media-pending` bucket for
   gift uploads awaiting moderation.
2. In the Supabase project, allow the app's production hostname in the settings
   required by your project and ensure the required tables are available through
   the API.
3. Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Set the
   public key as `VITE_VAPID_PUBLIC_KEY` in `.env.local` and in the frontend
   hosting provider's build environment. Keep the matching public/private keys
   and a `mailto:` subject handy for the Supabase secrets below. Do not rotate
   the keys while subscriptions are active; existing devices must subscribe
   again after a key change.
4. Configure the admin identity for Supabase Auth:

   - In Google Cloud Console, create a **Web application** OAuth client and
     configure its consent screen. Add the exact Supabase callback URL shown
     in the Supabase Google provider settings as an authorized redirect URI.
     While the consent screen is in testing mode, add the admin Google account
     as a test user.
   - In Supabase **Authentication → Sign In / Providers → Google**, enable
     Google and enter the OAuth client ID and client secret. Keep the client
     secret in Supabase; it is not a frontend environment variable.
   - In **Authentication → URL Configuration**, set the production Site URL
     and allow these callback URLs:
     `https://batify.site.je/admin` and `http://localhost:5173/admin`.
     Add any other actual development or production origins you use.
   - Set `VITE_ADMIN_EMAIL` in `.env.local` and in the frontend host's build
     variables to the Google account authorized for admin access. Set the
     server-side Supabase Function secret `ADMIN_EMAIL` to that same address.
     The Edge Function independently enforces this exact-email allowlist, so
     other Google accounts cannot use admin actions.
   - If the Google account is already a confirmed Supabase Auth user, use that
     account. Otherwise, Supabase may need to allow its first OAuth sign-in to
     create/link the user. Do not enable public sign-ups solely for admin
     access without considering the project-wide effect; the Edge Function
     allowlist remains the authorization boundary.

5. Install and authenticate the Supabase CLI, link this repository to the
   project, configure the server-side secrets, and deploy the Edge Functions:

   ```powershell
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase secrets set TURNSTILE_SECRET_KEY=<turnstile-secret>
   npx supabase secrets set ADMIN_EMAIL=developer@example.com
   npx supabase secrets set VAPID_PUBLIC_KEY=<vapid-public-key> VAPID_PRIVATE_KEY=<vapid-private-key> VAPID_SUBJECT=mailto:you@example.com
   npx supabase functions deploy create-page
   npx supabase functions deploy send-wish
   npx supabase functions deploy manage-page
   npx supabase functions deploy admin
   npx supabase functions deploy track-open
   ```

   For an existing installation, remove old custom-mailer/admin secrets if
   configured. Run each unset command separately:

   ```powershell
   npx supabase secrets unset EMAILJS_PUBLIC_KEY
   npx supabase secrets unset EMAILJS_PRIVATE_KEY
   npx supabase secrets unset EMAILJS_SERVICE_ID
   npx supabase secrets unset EMAILJS_TEMPLATE_ID
   npx supabase secrets unset RESEND_API_KEY
   npx supabase secrets unset RESEND_FROM
   npx supabase secrets unset ADMIN_OTP_SECRET
   npx supabase secrets unset ADMIN_SECRET
   ```

   Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into Edge
   Functions. The service-role key belongs on the server only; never place it in
   `.env.local` or any `VITE_*` variable.

6. Add each production hostname to Cloudflare Turnstile Hostname Management.
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
titles, descriptions, enablement, priority themes, and suggested gift labels.
Priority themes activate automatically inside their configured window using
Philippine time. Re-run `schema.sql` on existing projects before deploying the
updated Edge Functions and frontend; its bottom migration safely adds the
campaign table, page occasion and Christmas color columns, priority flag,
private push-subscription table, and coarse device metadata. Existing admin
challenge/session tables from older versions are untouched, but unused by
the Supabase Auth login. Visitors can turn off the automatic seasonal theme
and Christmas music independently on their device. Christmas page creators
can customize the tree and gift-box colors. Page owners can opt in to PWA push
alerts for new wishes/gifts and GCash contributions in their dashboard
settings. Push permission requires HTTPS and is not available from the Vite
development server; use a production build and `npm run preview`
to test the service worker locally.

The admin console uses Supabase Auth Google OAuth. The authorized Google
account's email must match both `VITE_ADMIN_EMAIL` and the Supabase Function
secret `ADMIN_EMAIL`. The admin Edge Function validates each Supabase access
token and permits only that exact, confirmed email address. No EmailJS/Resend
secrets or custom OTP tables are used by the current flow. Existing private
challenge/session tables from previous versions are left in place but are no
longer read or written. The sign-in button has a 30-second client-side cooldown
after a Google sign-in request; Supabase Auth rate limits remain the server-side
protection.

## Environment variables

The client template is [`.env.local.example`](.env.local.example). Copy it to
`.env.local` and configure:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase publishable/anon key. |
| `VITE_ADMIN_EMAIL` | Authorized Google account email for admin sign-in; must match the server-side `ADMIN_EMAIL` secret. |
| `VITE_TURNSTILE_SITE_KEY` | Public Turnstile site key for the deployed hostname. |
| `VITE_VAPID_PUBLIC_KEY` | Public VAPID key used when subscribing to push alerts. |
| `VITE_SITE_URL` | Canonical site URL used for absolute social metadata; production is `https://batify.site.je`. |
| `VITE_ADSENSE_CLIENT` | Optional AdSense publisher ID. |
| `VITE_ADSENSE_SLOT_HOME` | Optional AdSense slot for the home page. |
| `VITE_ADSENSE_SLOT_CREATE` | Optional AdSense slot for the create page. |
| `VITE_ADSENSE_SLOT_PUBLIC` | Optional AdSense slot for public birthday pages. |

Vite embeds `VITE_*` values in browser assets. Only use public values in these
variables. **Never put a Supabase secret/service-role key, Google OAuth client
secret, Turnstile secret, OTP secret, or VAPID private key in a
`VITE_*` variable.** The build rejects a Supabase key with the `sb_secret_`
prefix.

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

### Cloudflare Workers

The repository includes [`wrangler.jsonc`](wrangler.jsonc) for deploying the
static Vite app with Wrangler. Build with `npm run build`, then deploy from the
repository root with `npx wrangler deploy`. The config serves `dist/` and uses
Workers' native single-page-app fallback for client-side routes. Do not add a
catch-all `_redirects` rule to `/index.html`; Workers can reject it as an
infinite loop.

### InfinityFree — `batify.site.je`

InfinityFree hosts the static frontend only. Supabase (database, Storage, and
Edge Functions) stays hosted on Supabase. Build the site on your computer, then
upload the build output—not the source project—to InfinityFree.

#### 1. Add and connect your domain

1. Create an InfinityFree hosting account/site and add `batify.site.je` as its
   domain in the hosting control panel.
2. Follow the domain connection instructions shown in that control panel.
   Update DNS at your domain registrar with the exact nameservers or records
   InfinityFree provides; do not guess an IP address. Wait for DNS to
   propagate.
3. Enable HTTPS for the domain in the hosting panel and wait until the
   certificate is active.

#### 2. Configure and build Batify

1. On your computer, install Node.js (which includes npm), download or clone the
   project, and open a terminal in the project folder.
2. Create `.env.local` from `.env.local.example`:

   ```powershell
   Copy-Item .env.local.example .env.local
   ```

   On macOS/Linux, use `cp .env.local.example .env.local`.
3. In `.env.local`, set the public Supabase URL/key, the Turnstile **site key**
   allowed for `batify.site.je`, and:

   ```dotenv
   VITE_SITE_URL=https://batify.site.je
   ```

   Optional public settings such as the VAPID public key and AdSense IDs can
   also be set here. These `VITE_*` values are included in browser files and
   must not contain secrets.
4. Install dependencies and build:

   ```sh
   npm install
   npm run build
   ```

   Confirm that the build completes and creates a `dist/` folder. If you change
   any `VITE_*` setting later, rebuild and upload the new output; static hosts
   do not read `.env.local`.

#### 3. Upload the build output

Upload **the contents inside `dist/`** to the domain's `htdocs` folder. Do not
upload the `dist` folder as a nested folder. The upload should include
`index.html`, the generated `assets/` folder, and all other generated files and folders, including `preview.php`,
`preview-config.php`, the event-specific `og-*.png` images, and hidden
`.htaccess`. In File Manager, enable showing hidden
files if needed. You can upload with InfinityFree File Manager or an FTP client
using the FTP details from your control panel.

The build-generated `preview-config.php` contains only the canonical site URL
and public Supabase URL/anon key already used by the browser app; it must never
contain a service-role key. It is used by `preview.php` for crawler metadata.

Do **not** upload `.env.local`, `.env.local.example`, `node_modules/`, the
repository/source files, or your Supabase service-role key and other server
secrets.

#### 4. Set up the backend

The frontend on InfinityFree still depends on the Supabase backend:

1. Run or re-run [`schema.sql`](schema.sql) in the Supabase SQL Editor.
2. Register `batify.site.je` as an allowed hostname in Cloudflare Turnstile.
   Put its site key in `.env.local` before building and set the matching secret
   in Supabase:

   ```sh
   npx supabase secrets set TURNSTILE_SECRET_KEY=<turnstile-secret>
   ```
3. Link the Supabase CLI to the correct project, set the admin email-verification
   secret (`ADMIN_EMAIL`) and, if push is enabled, the VAPID keys/subject, then
   deploy the Edge Functions. See [Configure Supabase](#configure-supabase) for
   the complete commands. Never put server secrets in InfinityFree files or
   `VITE_*` variables.
4. If migrating an existing installation, use **Admin → Wishes → Secure older
   uploads** after deploying the updated `admin` function. Repeat until it
   reports no more batches.

#### 5. Verify the live site

Visit `https://batify.site.je/`, then directly open a nested route such as
`https://batify.site.je/p/<slug>` and refresh it. The Apache fallback in
[`public/.htaccess`](public/.htaccess) is copied into `dist/` and lets React
Router serve direct routes. Also test page creation and wish submission so you
can confirm the deployed Turnstile keys and Supabase functions are configured
for production.

Push notifications require HTTPS, browser permission, deployed push secrets,
and a valid VAPID public key in the build. For share previews, the generated
`.htaccess` routes recognized social crawlers to `preview.php`; that PHP endpoint
queries only public page metadata in Supabase and selects the matching
event-specific image. This requires PHP plus cURL or `allow_url_fopen` on the
host. Normal visitors continue to the React app. If the host disables PHP or
the crawler route is unavailable, link previews fall back to generic metadata.

### Other static hosts

- **Vercel:** deploy the Vite project with the required `VITE_*` build
  variables. [`vercel.json`](vercel.json) configures SPA routing and crawler
  link previews. Configure the server-only `SUPABASE_URL` and
  `SUPABASE_ANON_KEY` for the preview endpoint separately.
- **Netlify / Cloudflare Pages:** run `npm run build` and publish `dist`.
  Configure an SPA fallback in the hosting platform if it is not enabled by
  default. Cloudflare Pages and Cloudflare Workers are separate deployment
  targets; use the Wrangler configuration above for Workers.

Hosting providers may require different SPA rewrite rules. Verify direct
navigation to nested routes after deployment.

## Security and data handling

- The browser client is read-only under row-level security. Public writes go
  through Supabase Edge Functions.
- User-submitted text is checked on the server and in the matching forms for a
  practical set of English, Tagalog, and Bisaya profanity, including common
  Unicode, leetspeak, and punctuation obfuscations. It is not a guarantee of
  complete detection and can occasionally flag benign text.
- The `edit_token` is a bearer credential: anyone with the edit link can manage
  that page. Treat it like a password and avoid sharing it publicly.
- Anonymous page reads use an explicit safe-column list; the edit token is not
  selectable by the public client.
- Wish reads are protected by database policies as well as the UI. Scheduled
  wishes remain hidden until their reveal time.
- Payment proof images are stored in a private bucket and shown to the owner
  through short-lived signed URLs. Unapproved gift media is stored in the
  private `wish-media-pending` bucket and shown to page owners and admins through
  short-lived signed URLs. Approved gift media and GCash QR images use the
  public `wish-media` bucket; anonymous object listing is disabled.
- Uploads are checked by file signature, and SVG uploads are not accepted.
- The super-admin interface is at `/admin` and requires a Supabase Auth email
  verification code. Its overview links to page, wish, report, and contribution
  queues, shows configured rate limits, and administrators can filter pending
  wishes and payments. Device details are coarse categories only, not a
  persistent fingerprint; records created before this migration show Unknown.
- The History page is local to the current browser and begins collecting
  activity after this version is deployed. Clearing browser data or switching
  devices removes or does not carry over that history.
- After deploying the private pending-media flow, use **Admin → Wishes →
  Secure older uploads** to migrate existing unapproved gift media out of the
  public bucket. The action processes up to 20 uploads per run; repeat it until
  no more batches remain. Older uploads remain publicly accessible until
  migrated.

Review the schema, Edge Functions, and hosting configuration before using the
app with real user data.

## Optional: Google AdSense

To enable ads, configure `VITE_ADSENSE_CLIENT` and the real
`VITE_ADSENSE_SLOT_HOME`, `VITE_ADSENSE_SLOT_CREATE`, and
`VITE_ADSENSE_SLOT_PUBLIC` ad-unit IDs in `.env.local` and in the production
host's build environment, then rebuild and redeploy. Create the display units
in AdSense; placeholder IDs will not serve ads. Use the exact `VITE_` variable
names: for example, `SLOT_HOME` will not configure the home placement; use
`VITE_ADSENSE_SLOT_HOME`. Ads are placed below the main
content on the home, create, and public page views, not inside the wish form or
dashboard.

AdSense must approve the site and may take time to serve ads after deployment.
Ad blockers, browser privacy settings, an unapproved hostname, or a new/empty
ad unit can also prevent ads from appearing. A placement is labeled and given
its surrounding spacing only after AdSense reports a filled ad; empty or
unfilled units are hidden. Batify cannot choose whether the network serves
text, image, or video creatives. Local development is not a reliable way to
verify ad delivery.

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

- Vercel and PHP-enabled InfinityFree builds can provide per-page titles and
  event-specific social preview images. Other static hosts use generic
  metadata unless configured with their own crawler endpoint.
- Edit links cannot be recovered by page owners. The super-admin can retrieve
  an edit link for support purposes.
- GCash payments are manual: the recipient checks the payment and confirms it.
  There is no payment processor integration or automated fraud review.
- Rate limiting uses a shared database-backed limiter with an in-memory
  fallback if the database call fails; the fallback is best-effort across
  serverless instances.
- The service worker caches media and audio for up to 30 days, so deleted media
  or updated audio may remain in a visitor's cache until it expires or is
  cleared. Audio is cached after it is requested rather than precached during
  the build.
- The interface has not been verified on every mobile browser or low-end
  device. Validate it against the devices you intend to support.

## License

Batify is **proprietary, not open source**. You are not authorized to copy,
modify, distribute, deploy, or reuse Batify-owned source code, artwork, or
design without prior written permission. Third-party dependencies, fonts, and
other third-party materials remain under their own licenses. See
[`LICENSE`](LICENSE) for the full terms.
