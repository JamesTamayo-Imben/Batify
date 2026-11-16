// Crawler-only metadata for shared pages. Never return the letter or wish contents.
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]))

const EVENT_PREVIEWS = {
  christmas: { image: 'og-christmas.png', name: 'Christmas' },
  halloween: { image: 'og-halloween.png', name: 'Halloween' },
  valentines: { image: 'og-valentines.png', name: 'Valentine’s Day' },
  new_year: { image: 'og-new-year.png', name: 'New Year' },
  anniversary: { image: 'og-anniversary.png', name: 'Anniversary' },
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase()
  const incomingHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const host = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(incomingHost) ? incomingHost : 'batify.site.je'
  const origin = `https://${host}`
  let title = 'A celebration letter on Batify'
  let owner = ''
  let campaignType = ''

  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (/^[a-z0-9-]{3,80}$/.test(slug) && supabaseUrl && anonKey) {
    try {
      const endpoint = new URL(`${supabaseUrl}/rest/v1/pages`)
      endpoint.search = new URLSearchParams({
        slug: `eq.${slug}`,
        select: 'title,owner_name,campaign_type',
        limit: '1',
      }).toString()
      const response = await fetch(endpoint, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(4000),
      })
      if (!response.ok) throw new Error(`Supabase preview lookup returned ${response.status}.`)
      const rows = await response.json()
      if (rows[0]) {
        title = rows[0].title
        owner = rows[0].owner_name
        campaignType = rows[0].campaign_type || ''
      }
    } catch (error) {
      console.error('Could not load social preview metadata:', error)
    }
  }

  const event = EVENT_PREVIEWS[campaignType]
  const eventName = event?.name || 'birthday'
  const description = owner
    ? `${owner} made a ${eventName} letter on Batify. Open it and send a wish.`
    : 'Open the letter and send a wish on Batify.'
  const image = `${origin}/${event?.image || 'og.png'}`
  const pageUrl = `${origin}/p/${encodeURIComponent(slug)}`
  const safeTitle = esc(title)
  const safeDescription = esc(description)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${safeTitle} - Batify</title>
<meta name="description" content="${safeDescription}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Batify">
<meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${esc(pageUrl)}"><meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A ${esc(eventName)} letter from Batify">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}"><meta name="twitter:image" content="${esc(image)}">
</head><body><h1>${safeTitle}</h1><p>${safeDescription}</p></body></html>`)
}
