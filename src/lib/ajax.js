// Tiny fetch wrappers for Supabase Edge Functions. Errors always throw an Error
// with a human-readable message that the UI can show directly.
const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

async function request(fn, init) {
  let res
  try {
    res = await fetch(`${BASE}/${fn}`, init)
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Something went wrong (${res.status}).`)
  }
  return data
}

export function postJSON(fn, body) {
  return request(fn, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  })
}

// Do NOT set Content-Type — the browser adds the multipart boundary.
export function postForm(fn, formData) {
  return request(fn, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: formData,
  })
}
