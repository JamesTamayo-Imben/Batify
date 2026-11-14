import { useEffect, useState } from 'react'
import Icon from './Icon'
import { customColorOf, DEFAULT_CUSTOM_COLOR, THEMES, themeOf, themeStyleOf } from '../lib/themes'

export default function ThemePicker({ value, onChange, idPrefix }) {
  const [lastCustomColor, setLastCustomColor] = useState(() => customColorOf(value) || DEFAULT_CUSTOM_COLOR)
  const selectedTheme = themeOf(value)
  const isCustom = selectedTheme === 'custom'
  const customColor = customColorOf(value) || lastCustomColor
  const customPalette = themeStyleOf(customColor)

  useEffect(() => {
    const color = customColorOf(value)
    if (color) setLastCustomColor(color)
  }, [value])

  function chooseCustomColor(nextColor) {
    const color = customColorOf(nextColor)
    if (!color) return
    setLastCustomColor(color)
    onChange(color)
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Choose an envelope color theme">
        {Object.entries(THEMES).map(([id, theme]) => (
          <button key={id} type="button" role="radio" aria-checked={selectedTheme === id} onClick={() => onChange(id)}
            className={`flex min-h-[72px] items-center gap-3 rounded-xl border-2 border-ink p-3 text-left ${selectedTheme === id ? 'bg-sun shadow-sticker' : 'bg-white'}`}>
            <span className="flex shrink-0 -space-x-2" aria-hidden="true">
              {theme.swatch.map((color) => <span key={color} className="h-8 w-8 rounded-full border-2 border-ink" style={{ background: color }} />)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{theme.label}</span>
              <span className="block text-xs font-medium text-muted">{theme.note}</span>
            </span>
            {selectedTheme === id && <Icon name="check" className="shrink-0" strokeWidth={3} />}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={isCustom} onClick={() => chooseCustomColor(customColor)}
          className={`flex min-h-[72px] items-center gap-3 rounded-xl border-2 border-ink p-3 text-left ${isCustom ? 'bg-sun shadow-sticker' : 'bg-white'}`}>
          <span className="flex shrink-0 -space-x-2" aria-hidden="true">
            <span className="h-8 w-8 rounded-full border-2 border-ink" style={{ background: customColor }} />
            <span className="h-8 w-8 rounded-full border-2 border-ink" style={{ background: `rgb(${customPalette['--accent']})` }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Personalized</span>
            <span className="block text-xs font-medium text-muted">Your color, matched by Batify</span>
          </span>
          {isCustom && <Icon name="check" className="shrink-0" strokeWidth={3} />}
        </button>
      </div>
      {isCustom && (
        <div className="mt-3 grid gap-3 rounded-xl border-2 border-ink/20 bg-white p-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <label htmlFor={`${idPrefix}-custom-color`} className="flex min-h-11 items-center gap-3 font-semibold">
            Choose a color
            <input id={`${idPrefix}-custom-color`} type="color" value={customColor}
              onChange={(event) => chooseCustomColor(event.target.value)}
              aria-describedby={`${idPrefix}-custom-hint`}
              aria-label="Choose a custom theme color"
              className="h-11 w-16 cursor-pointer rounded-lg border-2 border-ink bg-white p-1" />
          </label>
          <p id={`${idPrefix}-custom-hint`} className="hint min-w-0 flex-1">
            Batify creates a matching light background and readable accents from this color.
          </p>
        </div>
      )}
    </>
  )
}
