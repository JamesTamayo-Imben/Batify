// Database ids stay the same (confetti, lavender, sky) so existing pages keep working.
export const THEMES = {
  confetti: { label: 'Mango', note: 'Sun yellow table, royal blue lining', swatch: ['#F7C531', '#1F33C7'] },
  lavender: { label: 'Ube', note: 'Lilac table, purple lining', swatch: ['#C7B6F5', '#3B1F9E'] },
  sky: { label: 'Dagat', note: 'Sea green table, deep teal lining', swatch: ['#9ADBD0', '#0A5560'] },
}
export const themeOf = (id) => (THEMES[id] ? id : 'confetti')
