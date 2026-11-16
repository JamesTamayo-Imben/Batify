import { useEffect, useState } from 'react'
import Icon from './Icon'

const KEY = 'batify:install-dismissed'

function isStandalone() {
  return window.navigator.standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
}

function isIosSafari() {
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua)
}

function wasDismissed() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

function rememberDismissal() {
  try { localStorage.setItem(KEY, '1') } catch { /* Install hint remains dismissible for this visit. */ }
}

export default function InstallHint() {
  const [show, setShow] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [iosInstructions, setIosInstructions] = useState(false)
  const [installError, setInstallError] = useState('')

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return undefined

    let timer
    const reveal = () => {
      if (!wasDismissed() && !isStandalone()) {
        setIosInstructions(isIosSafari())
        setShow(true)
      }
    }
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      reveal()
    }
    const onInstalled = () => {
      setShow(false)
      setInstallPrompt(null)
      rememberDismissal()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    timer = window.setTimeout(reveal, 10000)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!show) return null

  async function install() {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
      setShow(false)
      rememberDismissal()
    } catch (error) {
      console.error('Could not open the Batify install prompt:', error)
      setInstallError('The install prompt could not be opened. Try “Install app” in your browser menu.')
    }
  }

  function dismiss() {
    setShow(false)
    rememberDismissal()
  }

  return (
    <aside aria-label="Install Batify" className="fixed inset-x-3 bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg rounded-2xl border-2 border-ink bg-sun p-4 pr-14 shadow-sticker md:inset-x-auto md:bottom-4 md:right-4">
      <p className="text-sm font-semibold">
        {installPrompt
          ? 'Keep Batify close by. Install it for a handy home-screen shortcut.'
          : iosInstructions
            ? <>Add Batify to your home screen: tap <Icon name="share" size={16} className="inline -translate-y-px" label="Share" /> then choose “Add to Home Screen”.</>
            : 'Want quicker access? Use your browser menu to install Batify or add it to your home screen.'}
      </p>
      {installPrompt && <button type="button" className="btn-primary btn-sm mt-3" onClick={install}>Install Batify</button>}
      {installError && <p role="alert" className="mt-2 text-sm font-semibold text-flag">{installError}</p>}
      {!installPrompt && <button type="button" className="btn-ghost btn-sm mt-2" onClick={dismiss}>Got it</button>}
      <button type="button" onClick={dismiss} aria-label="Dismiss install suggestion" className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full">
        <Icon name="close" size={18} />
      </button>
    </aside>
  )
}
