// Paper confetti on a throwaway canvas. Pieces flip in 3D by squashing their height with a cosine.
// Fire-and-forget: fireConfetti({ x, y }) where x/y are 0..1 of the viewport. No-op with reduced motion.
const SHAPES = ['rect', 'flag', 'dot', 'strip']

export function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readColors() {
  const cs = getComputedStyle(document.documentElement)
  const themed = document.querySelector('[data-theme]')
  const src = themed ? getComputedStyle(themed) : cs
  const list = ['--flag-1', '--flag-2', '--flag-3', '--flag-4'].map((k) => src.getPropertyValue(k).trim()).filter(Boolean)
  return [...list, '#F7C531']
}

export function fireConfetti({ x = 0.5, y = 0.5, count = 140, spread = 1, power = 1 } = {}) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return () => {}
  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 200 })
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = (canvas.width = innerWidth * dpr)
  const H = (canvas.height = innerHeight * dpr)
  const ctx = canvas.getContext('2d')
  const colors = readColors()
  const ox = x * W
  const oy = y * H
  const parts = Array.from({ length: count }, () => {
    const a = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * spread
    const v = (6 + Math.random() * 11) * dpr * power
    return {
      x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      w: (6 + Math.random() * 8) * dpr, h: (8 + Math.random() * 10) * dpr,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
      flip: Math.random() * 6.28, vf: 0.12 + Math.random() * 0.2,
      color: colors[(Math.random() * colors.length) | 0], shape: SHAPES[(Math.random() * SHAPES.length) | 0],
      life: 0,
    }
  })
  let raf = 0
  let alive = true
  const stop = () => { alive = false; cancelAnimationFrame(raf); canvas.remove() }
  const t0 = performance.now()
  const frame = (t) => {
    if (!alive) return
    ctx.clearRect(0, 0, W, H)
    let any = false
    for (const p of parts) {
      p.vy += 0.32 * dpr
      p.vx *= 0.985; p.vy *= 0.985
      p.x += p.vx + Math.sin(p.flip) * 0.8 * dpr
      p.y += p.vy
      p.rot += p.vr; p.flip += p.vf; p.life++
      if (p.y < H + 40) any = true
      const sy = Math.cos(p.flip)
      ctx.save()
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, sy)
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - t0 - 2200) / 1200)
      ctx.fillStyle = p.color
      if (p.shape === 'rect') ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      else if (p.shape === 'strip') ctx.fillRect(-p.w / 6, -p.h, p.w / 3, p.h * 2)
      else if (p.shape === 'dot') { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 6.28); ctx.fill() }
      else { ctx.beginPath(); ctx.moveTo(-p.w / 2, -p.h / 2); ctx.lineTo(p.w / 2, -p.h / 2); ctx.lineTo(0, p.h / 2); ctx.closePath(); ctx.fill() }
      ctx.restore()
    }
    if (any && t - t0 < 3600) raf = requestAnimationFrame(frame)
    else stop()
  }
  raf = requestAnimationFrame(frame)
  return stop
}
