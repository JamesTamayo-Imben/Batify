import { useState } from 'react'
import Icon from './Icon'
import { copyText } from '../lib/share'

export default function ShareOptions({ title, text, url, className = '' }) {
  const [message, setMessage] = useState('')
  const [shareMessage, setShareMessage] = useState(text)
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(shareMessage)
  const postText = `${shareMessage}\n${url}`
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(postText)}`

  async function copy(value, successMessage) {
    const copied = await copyText(value)
    setMessage(copied ? successMessage : 'Could not copy to the clipboard.')
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text: shareMessage, url })
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
        Share message & post
      </summary>
      <div className="absolute right-0 z-30 mt-2 grid w-[min(20rem,calc(100vw-2rem))] gap-1 rounded-xl border-2 border-ink bg-white p-3 text-left shadow-sticker">
        <label htmlFor="share-message" className="px-1 text-sm font-bold">Message to share or post</label>
        <textarea
          id="share-message"
          className="field min-h-24 resize-y text-sm"
          value={shareMessage}
          maxLength={500}
          onChange={(event) => setShareMessage(event.target.value)}
        />
        <p className="px-1 text-xs text-muted">The selected app opens with this message and your public link. Review and post there.</p>
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button type="button" className="min-h-11 rounded-lg px-3 text-left font-semibold hover:bg-ground" onClick={nativeShare}>
            More sharing options
          </button>
        )}
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={`https://wa.me/?text=${encodeURIComponent(postText)}`} target="_blank" rel="noreferrer noopener">WhatsApp</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noreferrer noopener">Telegram</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`} target="_blank" rel="noreferrer noopener">Facebook</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noreferrer noopener">X</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 font-semibold hover:bg-ground" href={mailto}>Email</a>
        <button type="button" className="min-h-11 rounded-lg px-3 text-left font-semibold hover:bg-ground" onClick={() => copy(postText, 'Message and link copied.')}>Copy message & link</button>
        <button type="button" className="min-h-11 rounded-lg px-3 text-left font-semibold hover:bg-ground" onClick={() => copy(url, 'Link copied.')}>Copy link only</button>
        {message && <p className="px-3 py-1 text-sm text-muted" role="status">{message}</p>}
      </div>
    </details>
  )
}
