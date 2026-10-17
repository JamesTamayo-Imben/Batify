// Fiesta bunting: papel-picado style flags hanging from a sagging string.
// The string is a quadratic curve; each flag sits on the same parabola so they line up at any width.
export default function Banderitas({ count = 9, sag = 34, flagW = 34, flagH = 46, className = '' }) {
  const W = 1000
  const flags = Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count
    return { t, y: 4 * sag * t * (1 - t), k: (i % 4) + 1, delay: (i * 0.37) % 2 }
  })
  const w = flagW, h = flagH
  const tri = `M0 0H${w}L${w / 2} ${h}Z`
  const diamond = `M${w / 2} ${h * 0.2}l${w * 0.12} ${h * 0.11}l-${w * 0.12} ${h * 0.11}l-${w * 0.12} -${h * 0.11}z`
  return (
    <div className={`bunting ${className}`} style={{ height: sag + h + 8 }} aria-hidden="true">
      <svg className="string" viewBox={`0 0 ${W} ${sag}`} preserveAspectRatio="none" height={sag}>
        <path d={`M-20 -4Q${W / 2} ${sag * 2 + 4} ${W + 20} -4`} fill="none" stroke="rgb(var(--ink))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      {flags.map((f) => (
        <div key={f.t} className="flagwrap" style={{ left: `${f.t * 100}%`, top: f.y, animationDelay: `-${f.delay}s` }}>
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <path d={tri + diamond} fillRule="evenodd" fill={`var(--flag-${f.k})`} stroke="rgb(20 20 43)" strokeWidth="1.500" strokeLinejoin="round" />
            <circle cx={w / 2} cy={h * 0.62} r={w * 0.06} fill="rgb(var(--ground))" />
          </svg>
        </div>
      ))}
    </div>
  )
}
