import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Falls back to Cloudflare's always-pass TEST key when no site key is configured (dev only).
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'

let scriptPromise = null
function loadScript() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.defer = true
      s.onload = resolve
      s.onerror = () => {
        scriptPromise = null
        reject(new Error('Could not load the CAPTCHA. Check your connection and reload.'))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

/**
 * Explicit-render Turnstile widget.
 * Props: onToken(token|''), onError(message)
 * Ref API: ref.current.reset()  — call after any failed submit so the user can retry.
 */
const Turnstile = forwardRef(function Turnstile({ onToken, onError }, ref) {
  const box = useRef(null)
  const widgetId = useRef(null)
  const cbs = useRef({ onToken, onError })
  cbs.current = { onToken, onError }

  useEffect(() => {
    let dead = false
    loadScript()
      .then(() => {
        if (dead || !box.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          callback: (t) => cbs.current.onToken?.(t),
          'expired-callback': () => cbs.current.onToken?.(''),
          'error-callback': () => {
            cbs.current.onToken?.('')
            cbs.current.onError?.('CAPTCHA error. Please try again.')
          },
        })
      })
      .catch((e) => cbs.current.onError?.(e.message))
    return () => {
      dead = true
      if (widgetId.current != null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          /* already gone */
        }
      }
      widgetId.current = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    reset() {
      cbs.current.onToken?.('')
      if (widgetId.current != null && window.turnstile) {
        try {
          window.turnstile.reset(widgetId.current)
        } catch {
          /* ignore */
        }
      }
    },
  }), [])

  return <div ref={box} className="flex min-h-[65px] justify-center" />
})

export default Turnstile
