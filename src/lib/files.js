export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
export const MEDIA_MAX = 25 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PROOF_MAX = 10 * 1024 * 1024

export const formatBytes = (n) =>
  n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`

export function validateMedia(file) {
  if (!file) return 'Please choose a photo or video.'
  if (!MEDIA_TYPES.includes(file.type)) return 'Use a JPG, PNG, WebP, GIF, MP4 or WebM file.'
  if (file.size > MEDIA_MAX) return 'That file is over 25 MB.'
  return null
}

export function validateImage(file, max = PROOF_MAX) {
  if (!file) return 'Please choose an image.'
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image.'
  if (file.size > max) return `That image is over ${Math.round(max / 1048576)} MB.`
  return null
}
