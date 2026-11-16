// Remembers (per tab session) which letters this visitor has already opened, so the
// ceremony plays once and a reload goes straight to the page. Also dedupes open counting.
import { recordHistory } from './history'

const key = (slug) => `batify:opened:${slug}`
export const hasOpened = (slug) => { try { return sessionStorage.getItem(key(slug)) === '1' } catch { return false } }
export const markOpened = (slug) => {
  try { sessionStorage.setItem(key(slug), '1') } catch { /* ignore */ }
  recordHistory('opened', 'Opened a Batify letter', `/p/${slug}`)
}

const WKEY = (id) => `batify:unwrapped:${id}`
export const wishUnwrapped = (id) => { try { return sessionStorage.getItem(WKEY(id)) === '1' } catch { return false } }
export const markUnwrapped = (id) => { try { sessionStorage.setItem(WKEY(id), '1') } catch { /* ignore */ } }
export const clearUnwrapped = (id) => { try { sessionStorage.removeItem(WKEY(id)) } catch { /* ignore */ } }
