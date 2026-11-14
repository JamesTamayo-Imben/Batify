export function isPageExpired(expiresAt, now = new Date()) {
  const expiry = Date.parse(expiresAt)
  const currentTime = now instanceof Date ? now.getTime() : now
  return Number.isFinite(expiry) && expiry <= currentTime
}
