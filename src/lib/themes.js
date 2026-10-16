// Class names are written out in full so Tailwind can see them.
export const THEMES = {
  confetti: { label: 'Confetti', bg: 'from-brand-100 via-white to-amber-50', dot: 'bg-brand-500' },
  lavender: { label: 'Lavender', bg: 'from-violet-100 via-white to-pink-50', dot: 'bg-violet-400' },
  sky: { label: 'Sky', bg: 'from-sky-100 via-white to-emerald-50', dot: 'bg-sky-400' },
}
export const themeOf = (id) => THEMES[id] || THEMES.confetti
