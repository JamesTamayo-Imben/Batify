// qrcode is loaded on demand so it stays out of the main bundle.
const lib = () => import('qrcode').then((m) => m.default || m)

// Returns an SVG string (ink on white, quiet zone included) for the given text.
export async function qrSvg(text, { size = 220 } = {}) {
  const QRCode = await lib()
  return QRCode.toString(text, { type: 'svg', margin: 2, width: size, errorCorrectionLevel: 'M', color: { dark: '#14142B', light: '#FFFFFF' } })
}

// PNG data URL for download.
export async function qrPng(text, { size = 960 } = {}) {
  const QRCode = await lib()
  return QRCode.toDataURL(text, { margin: 2, width: size, errorCorrectionLevel: 'M', color: { dark: '#14142B', light: '#FFFFFF' } })
}
