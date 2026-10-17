import { useCallback, useEffect, useRef, useState } from 'react'
import useTilt from '../lib/useTilt'
import { prefersReducedMotion } from '../lib/confetti'

// Delay (ms) before each step is applied, relative to the previous step.
const UP = [0, 420, 780, 900]
const DOWN = [760, 800, 560, 420]

/**
 * Drives the envelope steps (0 sealed ... 4 letter risen). Timers are cleaned up on unmount.
 * With reduced motion it jumps straight to the target.
 */
export function useEnvelope({ max = 4, onStep, initial = 0 } = {}) {
  const [step, setStep] = useState(initial)
  const [busy, setBusy] = useState(false)
  const timers = useRef([])
  const stepRef = useRef(initial)
  const cb = useRef(onStep)
  cb.current = onStep

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => clear, [])

  const apply = useCallback((n) => { stepRef.current = n; setStep(n); cb.current?.(n) }, [])

  const goTo = useCallback((target) => {
    clear()
    const t = Math.max(0, Math.min(max, target))
    if (prefersReducedMotion()) { apply(t); setBusy(false); return }
    const dir = t > stepRef.current ? 1 : -1
    if (t === stepRef.current) return
    setBusy(true)
    let at = 0
    for (let s = stepRef.current + dir; dir > 0 ? s <= t : s >= t; s += dir) {
      at += dir > 0 ? UP[s - 1] : DOWN[s]
      const n = s
      timers.current.push(setTimeout(() => { apply(n); if (n === t) setBusy(false) }, at))
    }
  }, [apply, max])

  return { step, busy, goTo, open: () => goTo(max), close: () => goTo(0) }
}

/**
 * Props
 *  step        0..4 (see styles/envelope.css)
 *  initial     letter shown on the wax seal
 *  interactive show the invisible hit button while sealed
 *  onActivate  called when the seal is pressed
 *  size        CSS length for envelope width
 *  children    letter face (defaults to a simple face)
 */
export default function Envelope3D({ step = 0, initial = 'B', interactive = false, onActivate, size, label = 'Open the letter', still = false, pulsing = true, children, className = '' }) {
  const rig = useRef(null)
  useTilt(rig, { max: 9 })
  const cls = ['env', ...['s1', 's2', 's3', 's4'].slice(0, step), still ? 'is-still' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls} style={size ? { '--env-w': size } : undefined}>
      <div className="env-shadow" />
      <div className="env-bob">
        <div className="env-rig" ref={rig}>
          <div className="env-back" />
          <div className="env-letter"><div className="env-paper">{children}</div></div>
          <div className="env-front"><i className="l" /><i className="r" /><i className="b" /><i className="edge" /></div>
          <div className="env-flap">
            <div className="face in" />
            <div className="face out" />
            <div className={`env-seal ${pulsing && step === 0 && interactive ? 'is-pulsing' : ''}`} style={{ '--env-ring': '255 255 255' }}>
              <div className="half hl"><span className="disc">{initial}</span></div>
              <div className="half hr"><span className="disc">{initial}</span></div>
            </div>
          </div>
        </div>
      </div>
      {interactive && step === 0 && (
        <button type="button" className="env-hit" onClick={onActivate} aria-label={label} />
      )}
    </div>
  )
}
