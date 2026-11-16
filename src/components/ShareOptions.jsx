import { useState } from 'react'
import Icon from './Icon'
import { copyText } from '../lib/share'

export default function ShareOptions({ title, text, url, className = '' }) {
  const [message, setMessage] = useState('')
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`

  async function copy() {
    const copied = await copyText(url)
    setMessage(copied ? 'Link copied.' : 'Could not copy the link.')
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url })
      setMessage('')
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Could not open the share sheet:', error)
        setMessage('Could not open sharing options. Choose an app below.')
      }
    }
  }

  return (
    <details className={`relative ${className}`}>
      <summary className="btn-ghost btn-sm inline-flex cursor-pointer list-none items-center gap-2">
        <Icon name="share" size={16} />
        Share
      </summary>
      <div className="absolute right-0 z-30 mt-2 grid min-w-52 gap-1 rounded-xl border-2 border-ink bg-white p-2 text-left shadow-sticker">
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button type="button" className="min-h-11 rounded-lg px-3 text-left font-semibold hover:bg-ground" onClick={nativeShare}>
            More sharing options
          </button>
        )}
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`} target="_blank" rel="noreferrer noopener">WhatsApp</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noreferrer noopener">Telegram</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer noopener">Facebook</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={mailto}>Email</a>
        <button type="button" className="min-h-11 rounded-lg px-3 text-left font-semibold hover:bg-ground" onClick={copy}>Copy link</button>
        {message && <p className="px-3 py-1 text-sm text-muted" role="status">{message}</p>}
      </div>
    </details>
  )
}
