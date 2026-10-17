import { useEffect, useRef, useState } from 'react'

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { Days: Math.floor(s / 86400), Hours: Math.floor((s % 86400) / 3600), Min: Math.floor((s % 3600) / 60), Sec: s % 60 }
}
const pad = (n) => String(n).padStart(2, '0')

function FlipCard({ value, label }) {
  const text = pad(value)
  const [state, setState] = useState({ cur: text, prev: text, tick: 0 })
  useEffect(() => {
    setState((s) => (s.cur === text ? s : { cur: text, prev: s.cur, tick: s.tick + 1 }))
  }, [text])
  const wide = text.length > 2 ? { width: `calc(var(--fw) * ${0.5 + text.length * 0.5})` } : undefined
  return (
    <div className="flip-unit">
      <div className="flip" style={wide}>
        <div className="half top"><span>{state.cur}</span></div>
        <div className="half bot"><span>{state.tick ? state.prev : state.cur}</span></div>
        {state.tick > 0 && (
          <>
            <div key={`t${state.tick}`} className="half top fold-top"><span>{state.prev}</span></div>
            <div key={`b${state.tick}`} className="half bot fold-bot"><span>{state.cur}</span></div>
          </>
        )}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(50% - 1px)', height: 2, background: 'rgb(var(--ground))', zIndex: 5 }} />
      </div>
      <small>{label}</small>
    </div>
  )
}

export default function FlipCountdown({ target, onDone }) {
  const end = new Date(target).getTime()
  const [left, setLeft] = useState(end - Date.now())
  const fired = useRef(false)
  useEffect(() => {
    const id = setInterval(() => setLeft(end - Date.now()), 1000)
    return () => clearInterval(id)
  }, [end])
  useEffect(() => {
    if (left <= 0 && !fired.current) { fired.current = true; onDone?.() }
  }, [left, onDone])
  const p = parts(left)
  return (
    <div>
      <p className="sr-only" role="timer" aria-live="off">{`${p.Days} days, ${p.Hours} hours, ${p.Min} minutes left`}</p>
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-4" aria-hidden="true">
        {Object.entries(p).map(([label, v]) => <FlipCard key={label} value={v} label={label} />)}
      </div>
    </div>
  )
}
