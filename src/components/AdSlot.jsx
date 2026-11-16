import { useEffect, useRef, useState } from 'react'

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT

/**
 * Responsive AdSense unit. Renders nothing when VITE_ADSENSE_CLIENT is unset.
 * Placement rules (see README): never inside the send form, never over / next to
 * media, never on the owner dashboard.
 */
export default function AdSlot({ slot, className = '', client = CLIENT }) {
  const adRef = useRef(null)
  const pushedSlot = useRef('')
  const [status, setStatus] = useState('pending')
  const enabled = Boolean(client && slot)

  useEffect(() => {
    if (!enabled) return undefined

    const ad = adRef.current
    if (!ad) return undefined

    let active = true
    setStatus('pending')
    const updateStatus = () => {
      const nextStatus = ad.getAttribute('data-ad-status')
      if (active && (nextStatus === 'filled' || nextStatus === 'unfilled')) {
        setStatus(nextStatus)
      }
    }
    const observer = new MutationObserver(updateStatus)
    observer.observe(ad, { attributes: true, attributeFilter: ['data-ad-status'] })
    const timeout = window.setTimeout(() => {
      if (active) setStatus((current) => current === 'pending' ? 'timed-out' : current)
    }, 15000)

    const slotKey = `${client}:${slot}`
    if (pushedSlot.current !== slotKey) {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        pushedSlot.current = slotKey
      } catch (error) {
        console.warn('AdSense push failed', error)
        setStatus('unavailable')
      }
    }
    updateStatus()

    return () => {
      active = false
      observer.disconnect()
      window.clearTimeout(timeout)
    }
  }, [client, enabled, slot])

  if (!enabled) return null
  const filled = status === 'filled'
  const unavailable = status === 'unfilled' || status === 'unavailable' || status === 'timed-out'
  return (
    <aside
      aria-label={filled ? 'Advertisement' : undefined}
      aria-hidden={!filled}
      className={`mx-auto w-full max-w-3xl overflow-hidden ${filled ? 'my-10' : ''} ${className}`}
    >
      {filled && <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-slate-400">Advertisement</p>}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: unavailable ? 'none' : 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
