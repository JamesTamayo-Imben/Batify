import { useEffect } from 'react'
import { prefersReducedMotion } from './confetti'

/**
 * Pointer tilt. Writes CSS variables on the element: (xVar, yVar) in degrees.
 * Listens on the window so the tilt keeps following the cursor near the element.
 * Touch devices simply get the idle animation.
 */
export default function useTilt(ref, { max = 10, xVar = '--rx', yVar = '--ry', local = false } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || !matchMedia('(hover: hover)').matches) return
    let raf = 0
    const target = local ? el : window
    const move = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const nx = local ? (e.clientX - r.left) / r.width - 0.5 : (e.clientX - (r.left + r.width / 2)) / innerWidth
        const ny = local ? (e.clientY - r.top) / r.height - 0.5 : (e.clientY - (r.top + r.height / 2)) / innerHeight
        el.style.setProperty(yVar, `${(nx * max * 2).toFixed(2)}deg`)
        el.style.setProperty(xVar, `${(-ny * max * 2).toFixed(2)}deg`)
      })
    }
    const leave = () => { el.style.setProperty(xVar, '0deg'); el.style.setProperty(yVar, '0deg') }
    target.addEventListener('pointermove', move, { passive: true })
    if (local) el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      target.removeEventListener('pointermove', move)
      if (local) el.removeEventListener('pointerleave', leave)
    }
  }, [ref, max, xVar, yVar, local])
}
