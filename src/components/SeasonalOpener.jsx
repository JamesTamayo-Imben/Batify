import { useEffect, useRef, useState } from 'react'
import { customColorOf } from '../lib/themes'

const CHRISTMAS_TREE_COLOR = '#176B45'
const CHRISTMAS_GIFT_BOX_COLOR = '#C92F20'

const EVENT_NAMES = {
  christmas: 'Christmas tree',
  halloween: 'pumpkin',
  valentines: 'heart',
  new_year: 'fireworks',
  anniversary: 'anniversary rings',
}

const GIFT_PALETTES = {
  christmas: { box: '#C92F20', ribbon: '#F7C531' },
  halloween: { box: '#6A3F86', ribbon: '#F28C28' },
  valentines: { box: '#C92F52', ribbon: '#FFE5E8' },
  new_year: { box: '#174970', ribbon: '#F7C531' },
  anniversary: { box: '#C98B57', ribbon: '#F7D983' },
}

function SeasonalMark({ theme, className = '', treeColor }) {
  if (theme === 'christmas') {
    return (
      <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
        <path d="M50 5l7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2z" fill="#F7C531" stroke="#14142B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M50 20L19 58h18L14 83h25L24 105h52L61 83h25L63 58h18z" fill={treeColor} stroke="#14142B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M42 105v11h16v-11" fill="#8C542E" stroke="#14142B" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="40" cy="58" r="4" fill="#C92F20" /><circle cx="60" cy="73" r="4" fill="#F7C531" /><circle cx="43" cy="88" r="4" fill="#C92F20" />
      </svg>
    )
  }
  if (theme === 'halloween') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <path d="M50 19c-6-12 5-16 13-13-2 7-5 12-13 13z" fill="#176B45" stroke="#14142B" strokeWidth="3" />
        <path d="M50 26c-10-12-34-4-38 19-5 30 14 43 38 41 24 2 43-11 38-41-4-23-28-31-38-19z" fill="#F28C28" stroke="#14142B" strokeWidth="3" />
        <path d="M23 39c-7 18-3 33 8 41M42 27c-7 18-7 40 0 57m16-57c7 18 7 40 0 57m17-45c7 18 3 33-8 41" fill="none" stroke="#C96C16" strokeWidth="3" />
        <path d="M33 53l12 5-11 6zm34 0l-12 5 11 6zM40 72h20l-10 9z" fill="#14142B" />
      </svg>
    )
  }
  if (theme === 'valentines') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <path d="M50 86S12 63 12 37c0-23 29-29 38-8 9-21 38-15 38 8 0 26-38 49-38 49z" fill="#E05170" stroke="#14142B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M50 67c-7-8-16-12-16-19 0-9 12-11 16-2 4-9 16-7 16 2 0 7-9 11-16 19z" fill="#FFE5E8" />
        <path d="M50 15v13m-7-6h14" stroke="#F7C531" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  }
  if (theme === 'anniversary') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <circle cx="39" cy="53" r="22" fill="none" stroke="#C98B57" strokeWidth="8" />
        <circle cx="61" cy="53" r="22" fill="none" stroke="#D6A94B" strokeWidth="8" />
        <path d="M50 18v12m-6-6h12" stroke="#C92F52" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 50L50 12m0 38l25-28m-25 28l38 1M50 50l26 27M50 50l-1 38M50 50L24 77M50 50L12 49m38 1L25 24" stroke="#F7C531" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="12" r="6" fill="#E05170" /><circle cx="75" cy="22" r="6" fill="#F28C28" /><circle cx="88" cy="51" r="6" fill="#E05170" /><circle cx="76" cy="77" r="6" fill="#F7C531" /><circle cx="49" cy="88" r="6" fill="#E05170" /><circle cx="24" cy="77" r="6" fill="#F28C28" /><circle cx="12" cy="49" r="6" fill="#E05170" /><circle cx="25" cy="24" r="6" fill="#F7C531" />
    </svg>
  )
}

export function EventMark({ theme, className = '', treeColor }) {
  return <SeasonalMark theme={theme} className={className} treeColor={treeColor} />
}

export default function SeasonalOpener({
  theme,
  title,
  letterText,
  step,
  onActivate,
  className = '',
  treeColor: customTreeColor,
  giftBoxColor: customGiftBoxColor,
}) {
  const [shakeEnabled, setShakeEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [shakeCount, setShakeCount] = useState(0)
  const lastShake = useRef(Number.NEGATIVE_INFINITY)
  const aboveThreshold = useRef(false)
  const name = EVENT_NAMES[theme] || 'event icon'
  const giftPalette = GIFT_PALETTES[theme] || GIFT_PALETTES.christmas
  const treeColor = customColorOf(customTreeColor) || CHRISTMAS_TREE_COLOR
  const giftBoxColor = customColorOf(customGiftBoxColor) || giftPalette.box

  useEffect(() => {
    if (!shakeEnabled) return undefined
    const onMotion = (event) => {
      if (step > 0) return
      const { x, y, z } = event.accelerationIncludingGravity || {}
      if (![x, y, z].every(Number.isFinite)) return
      const strength = Math.hypot(x, y, z)
      if (strength <= 18) {
        aboveThreshold.current = false
        return
      }
      if (aboveThreshold.current) return
      aboveThreshold.current = true

      const now = Date.now()
      if (now - lastShake.current >= 300) {
        lastShake.current = now
        const nextCount = shakeCount + 1
        setShakeCount(nextCount)
        if (nextCount === 3) {
          setMessage('Three shakes detected. Opening your letter…')
          onActivate()
        } else {
          const remaining = 3 - nextCount
          setMessage(`${nextCount} of 3 shakes. Shake ${remaining} more ${remaining === 1 ? 'time' : 'times'} to open.`)
        }
      }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [onActivate, shakeCount, shakeEnabled, step])

  async function enableShake() {
    const motion = window.DeviceMotionEvent
    if (!motion) {
      setMessage('Shake is not available here. Tap the illustration to open the letter.')
      return
    }
    try {
      if (typeof motion.requestPermission === 'function') {
        const permission = await motion.requestPermission()
        if (permission !== 'granted') throw new Error('Motion permission was not granted.')
      }
      setShakeEnabled(true)
      setMessage(`Shake enabled. Shake your phone 3 times to open, or tap the ${name}.`)
    } catch (error) {
      setMessage('Shake could not be enabled. Tap the illustration to open the letter.')
    }
  }

  return (
    <div className={`seasonal-opener ${className} ${step > 0 ? 'is-opening' : ''}`}>
      <div className="seasonal-letter" aria-hidden="true">
        <span>A letter for you</span>
        <strong>{title}</strong>
        {letterText && <p>{letterText}</p>}
      </div>
      <svg className="seasonal-gift" viewBox="0 0 80 80" aria-hidden="true">
        <path d="M14 34h52v38H14z" fill={giftBoxColor} stroke="#14142B" strokeWidth="3" />
        <path d="M35 34v38m-21-26h52" stroke={giftPalette.ribbon} strokeWidth="7" />
        <path d="M40 33C18 27 19 9 31 12c8 2 9 15 9 21zm0 0c22-6 21-24 9-21-8 2-9 15-9 21z" fill={giftPalette.ribbon} stroke="#14142B" strokeWidth="3" />
      </svg>
      <button
        type="button"
        className="seasonal-trigger"
        onClick={onActivate}
        disabled={step > 0}
        aria-label={step > 0 ? 'Opening the letter' : `Tap the ${name} to open the letter`}
      >
        <SeasonalMark theme={theme} className="seasonal-mark" treeColor={treeColor} />
      </button>
      <p className="mt-4 text-lg font-bold" aria-live="polite">
        {step === 0 ? `Tap the ${name} to open the letter` : 'Opening your letter…'}
      </p>
      {step === 0 && !shakeEnabled && (
        <button type="button" className="btn-ghost btn-sm mt-3" onClick={enableShake}>
          Enable shake to open
        </button>
      )}
      {message && <p className="mt-2 text-sm font-semibold" role="status">{message}</p>}
    </div>
  )
}
