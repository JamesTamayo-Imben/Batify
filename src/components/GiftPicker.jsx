import { useRef } from 'react'
import { GIFTS } from '../lib/gifts'
import { tap } from '../lib/haptics'
import useTilt from '../lib/useTilt'
import GiftArt from './art/GiftArt'
import Icon from './Icon'

function Tile({ g, on, disabled, onPick }) {
  const ref = useRef(null)
  useTilt(ref, { max: 9, xVar: '--trx', yVar: '--try', local: true })
  return (
    <button ref={ref} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => { tap(); onPick(g.id) }}
      className={`tilt relative flex flex-col items-center gap-1 rounded-2xl border-2 px-2 pb-3 pt-4 text-sm font-bold ${on ? 'border-ink bg-sun shadow-sticker' : 'border-ink/25 bg-white hover:border-ink/70'}`}
      style={{ minHeight: 44 }}>
      {on && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-white"><Icon name="check" size={14} strokeWidth={3} /></span>}
      <GiftArt id={g.id} className={`h-20 w-20 transition-transform duration-300 ${on ? 'scale-110 -rotate-3' : ''}`} />
      {g.label}
    </button>
  )
}

export default function GiftPicker({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Choose a gift" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {GIFTS.map((g) => <Tile key={g.id} g={g} on={value === g.id} disabled={disabled} onPick={onChange} />)}
    </div>
  )
}
