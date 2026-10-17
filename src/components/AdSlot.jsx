import { useEffect, useRef } from 'react'

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT

/**
 * Responsive AdSense unit. Renders nothing when VITE_ADSENSE_CLIENT is unset.
 * Placement rules (see README): never inside the send form, never over / next to
 * media, never on the owner dashboard.
 */
export default function AdSlot({ slot, className = '' }) {
  const pushed = useRef(false)

  useEffect(() => {
    if (!CLIENT || pushed.current) return
    pushed.current = true // guard against StrictMode / re-render double push
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.warn('AdSense push failed', e)
    }
  }, [])

  if (!CLIENT) return null
  return (
    <aside aria-label="Advertisement" className={`mx-auto my-10 w-full max-w-3xl overflow-hidden ${className}`}>
      <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-slate-400">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
