// Autosaves the create-page form so a closed tab doesn't lose a half-written letter.
// Never stores the CAPTCHA token or anything secret.
const KEY = 'batify:draft'
export function loadDraft() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : null } catch { return null }
}
export function saveDraft(d) { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* storage unavailable */ } }
export function clearDraft() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
