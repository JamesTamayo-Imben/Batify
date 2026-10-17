/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (see src/styles/tokens.css). Pages retheme by overriding the variables.
        ink: v('ink'),
        paper: v('paper'),
        card: v('card'),
        rule: v('rule'),
        muted: v('muted'),
        accent: { DEFAULT: v('accent'), deep: v('accent-deep'), soft: v('accent-soft') },
        sun: v('sun'),
        flag: v('flag'),
        ground: v('ground'),
        // Legacy palette names used by the admin console and older screens, remapped.
        brand: {
          50: v('accent-soft'), 100: v('accent-soft'), 200: v('rule'), 300: v('accent'),
          400: v('accent'), 500: v('accent'), 600: v('accent-deep'), 700: v('accent-deep'),
        },
        slate: {
          50: '#F6F6FA', 100: '#EEEEF4', 200: '#DEDEE8', 300: '#C8C8D6', 400: '#6F6F86',
          500: '#5A5A72', 600: '#45455C', 700: '#303048', 800: '#20203A', 900: '#14142B',
        },
      },
      fontFamily: {
        display: ['"Figtree Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Figtree Variable"', 'system-ui', 'sans-serif'],
        letter: ['"Newsreader Variable"', 'Georgia', 'serif'],
        hand: ['"Reenie Beanie"', 'cursive'],
      },
      boxShadow: {
        sticker: '0 3px 0 0 rgb(var(--ink))',
        lift: '0 18px 40px -18px rgb(var(--ink) / .45)',
      },
    },
  },
  plugins: [],
}
