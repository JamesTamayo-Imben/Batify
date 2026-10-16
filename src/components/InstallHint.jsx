import { useEffect, useState } from 'react'

const KEY = 'batify:install-dismissed'

function shouldShow() {
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua)
  const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  if (!ios || !safari || standalone) return false
  try {
    return localStorage.getItem(KEY) !== '1'
  } catch {
    return true
  }
}

export default function InstallHint() {
  const [show, setShow] = useState(false)
  useEffect(() => setShow(shouldShow()), [])
  if (!show) return null

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Install Batify"
      className="fixed inset-x-3 z-50 rounded-2xl border border-brand-200 bg-white p-4 shadow-lg md:hidden"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      <p className="pr-6 text-sm text-slate-700">
        <strong>Install Batify:</strong> tap <span aria-label="Share">⬆️ Share</span>, then{' '}
        <strong>Add to Home Screen</strong>.
      </p>
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 rounded-full p-2 text-slate-400">
        ✕
      </button>
    </div>
  )
}
