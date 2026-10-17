// Link-preview endpoint for chat and social crawlers (Messenger, WhatsApp, Telegram, X, Slack...).
// Crawlers don't run JavaScript, so the single-page app would give every shared link the same generic
// preview. vercel.json routes /p/:slug here ONLY for known crawler user agents; people get the SPA.
//
// Privacy: only the page title and owner name are exposed, never the letter or the wishes.
// Env (Vercel project settings): SUPABASE_URL, SUPABASE_ANON_KEY (same values as the VITE_ ones).

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase()
  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  const origin = `https://${host}`
  let title = 'A birthday letter on Batify'
  let owner = ''

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env
  if (/^[a-z0-9-]{3,80}$/.test(slug) && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/pages?slug=eq.${slug}&select=title,owner_name&limit=1`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(4000),
      })
      const rows = r.ok ? await r.json() : []
      if (rows[0]) { title = rows[0].title; owner = rows[0].owner_name }
    } catch { /* fall back to the generic preview */ }
  }

  const desc = owner ? `${owner} sent you a letter. Tap to open the envelope and send a birthday wish.` : 'Open the envelope and send a birthday wish.'
  const url = `${origin}/p/${esc(slug)}`
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)} - Batify</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Batify">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${origin}/og.png">
</head><body><h1>${esc(title)}</h1><p>${esc(desc)}</p></body></html>`)
}
