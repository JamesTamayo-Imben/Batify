import { useEffect, useRef, useState } from 'react'

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

export default function Countdown({ target, onDone }) {
  const end = new Date(target).getTime()
  const [left, setLeft] = useState(end - Date.now())
  const fired = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setLeft(end - Date.now()), 1000)
    return () => clearInterval(id)
  }, [end])

  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true
      onDone?.()
    }
  }, [left, onDone])

  const p = parts(left)
  const boxes = [['Days', p.d], ['Hours', p.h], ['Min', p.m], ['Sec', p.s]]
  return (
    <div role="timer" aria-live="off" className="grid grid-cols-4 gap-2 sm:gap-3">
      {boxes.map(([label, v]) => (
        <div key={label} className="rounded-2xl border border-brand-100 bg-white py-3 text-center shadow-sm">
          <div className="font-display text-3xl font-bold tabular-nums text-brand-500 sm:text-4xl">
            {String(v).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  )
}
