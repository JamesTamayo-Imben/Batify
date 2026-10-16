import { GIFTS } from '../lib/gifts'
import { tap } from '../lib/haptics'

export default function GiftPicker({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Choose a gift" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {GIFTS.map((g) => {
        const on = value === g.id
        return (
          <button
            key={g.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => {
              tap()
              onChange(g.id)
            }}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-xs font-semibold transition ${
              on ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200'
            }`}
          >
            <span className={`text-3xl transition ${on ? 'scale-110' : ''}`} aria-hidden="true">{g.emoji}</span>
            {g.label}
          </button>
        )
      })}
    </div>
  )
}
