const vibrate = (p) => {
  try {
    if (navigator.vibrate) navigator.vibrate(p)
  } catch {
    /* unsupported */
  }
}
export const tap = () => vibrate(10)
export const success = () => vibrate([20, 40, 30])
export const error = () => vibrate([40, 60, 40])
