// Database ids stay stable so existing pages keep their current palettes.
export const THEMES = {
  confetti: { label: 'Mango', note: 'Sun yellow and royal blue', swatch: ['#F7C531', '#1F33C7'] },
  lavender: { label: 'Ube', note: 'Lilac and deep purple', swatch: ['#C7B6F5', '#3B1F9E'] },
  sky: { label: 'Dagat', note: 'Sea green and deep teal', swatch: ['#9ADBD0', '#0A5560'] },
  rosas: { label: 'Rosas', note: 'Blush pink and berry', swatch: ['#F5C2D3', '#81284A'] },
  hapon: { label: 'Hapon', note: 'Warm peach and terracotta', swatch: ['#FFC59B', '#8C3D1D'] },
  dahon: { label: 'Dahon', note: 'Fresh green and forest', swatch: ['#BDE7D2', '#225B4C'] },
  alon: { label: 'Alon', note: 'Clear blue and ocean', swatch: ['#ACD6F4', '#174970'] },
}

export const DEFAULT_CUSTOM_COLOR = '#E0518B'
const HEX_COLOR = /^#[\da-f]{6}$/i

export function customColorOf(value) {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toUpperCase() : null
}

export function themeOf(value) {
  if (customColorOf(value)) return 'custom'
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEMES, value) ? value : 'confetti'
}

function hexToRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

function rgbToHsl([red, green, blue]) {
  const [r, g, b] = [red, green, blue].map((value) => value / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const lightness = (max + min) / 2
  let hue = 0
  let saturation = 0

  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
    if (max === r) hue = 60 * (((g - b) / delta) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
    if (hue < 0) hue += 360
  }
  return [hue, saturation, lightness]
}

function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1))
  const m = lightness - chroma / 2
  let rgb

  if (h < 60) rgb = [chroma, x, 0]
  else if (h < 120) rgb = [x, chroma, 0]
  else if (h < 180) rgb = [0, chroma, x]
  else if (h < 240) rgb = [0, x, chroma]
  else if (h < 300) rgb = [x, 0, chroma]
  else rgb = [chroma, 0, x]

  return rgb.map((value) => Math.round((value + m) * 255))
}

function relativeLuminance([r, g, b]) {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(a, b) {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function rgbTriplet(rgb) {
  return rgb.join(' ')
}

export function themeStyleOf(value) {
  const color = customColorOf(value)
  if (!color) return undefined

  const [hue, saturation, lightness] = rgbToHsl(hexToRgb(color))
  const ground = hslToRgb(hue, saturation, Math.max(lightness, 0.88))
  const white = [255, 255, 255]
  let accentLightness = Math.min(lightness, 0.3)
  let accent = hslToRgb(hue, saturation, accentLightness)
  while (accentLightness > 0.08 && contrastRatio(accent, white) < 4.5) {
    accentLightness -= 0.01
    accent = hslToRgb(hue, saturation, accentLightness)
  }
  const deepAccent = hslToRgb(hue, saturation, Math.max(0.08, accentLightness - 0.08))

  return {
    '--ground': rgbTriplet(ground),
    '--accent': rgbTriplet(accent),
    '--accent-deep': rgbTriplet(deepAccent),
    '--accent-soft': rgbTriplet(hslToRgb(hue, saturation * 0.35, 0.95)),
    '--env-back': rgbToHex(hslToRgb(hue, saturation * 0.35, 0.9)),
    '--env-side': rgbToHex(hslToRgb(hue, saturation * 0.25, 0.95)),
    '--env-bottom': rgbToHex(hslToRgb(hue, saturation * 0.15, 0.98)),
    '--env-flap': rgbToHex(hslToRgb(hue, saturation * 0.3, 0.92)),
    '--env-liner': rgbToHex(accent),
    '--env-seal': rgbToHex(accent),
    '--env-seal-deep': rgbToHex(deepAccent),
    '--flag-1': rgbToHex(accent),
    '--flag-2': color,
    '--flag-3': '#FFFFFF',
    '--flag-4': '#14142B',
  }
}
