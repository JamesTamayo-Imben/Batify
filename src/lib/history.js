const KEY = 'batify:history'
const LIMIT = 100

export function readHistory() {
  try {
    const entries = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(entries) ? entries.filter(isValidEntry) : []
  } catch {
    return []
  }
}

function isValidEntry(entry) {
  return entry && typeof entry.id === 'string' &&
    typeof entry.action === 'string' &&
    typeof entry.label === 'string' &&
    typeof entry.createdAt === 'string'
}

export function recordHistory(action, label, href = '') {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    label: String(label || '').slice(0, 100),
    href: typeof href === 'string' && href.startsWith('/') ? href.slice(0, 120) : '',
    createdAt: new Date().toISOString(),
  }
  try {
    const previous = readHistory()
    const recentDuplicate = previous[0]?.action === entry.action &&
      previous[0]?.href === entry.href &&
      Date.now() - new Date(previous[0].createdAt).getTime() < 30_000
    if (!recentDuplicate) localStorage.setItem(KEY, JSON.stringify([entry, ...previous].slice(0, LIMIT)))
  } catch {
    // History is a local convenience and must not interrupt the primary action.
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // History is a local convenience and must not interrupt the primary action.
  }
}
