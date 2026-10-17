// Convenience only: remembers pages you created / opened ON THIS DEVICE so the
// "My page" tab can list them. The token never leaves localStorage.
const KEY = 'batify:pages'

export function loadMyPages() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function rememberPage({ slug, token, title }) {
  try {
    const rest = loadMyPages().filter((p) => p.token !== token)
    localStorage.setItem(KEY, JSON.stringify([{ slug, token, title }, ...rest].slice(0, 10)))
  } catch {
    /* storage unavailable */
  }
}

export function forgetPage(token) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadMyPages().filter((p) => p.token !== token)))
  } catch {
    /* storage unavailable */
  }
}
