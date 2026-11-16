import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { copyText } from '../lib/share'

export default function ShareOptions({ title, text, url, className = '' }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [shareMessage, setShareMessage] = useState(text)
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const textareaId = `share-message-${useId().replace(/:/g, '')}`
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(shareMessage)
  const postText = `${shareMessage}\n${url}`
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(postText)}`

  useLayoutEffect(() => {
    if (!open) return undefined
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(320, window.innerWidth - 24)
      const menuHeight = menuRef.current?.getBoundingClientRect().height || 420
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2))
      const below = rect.bottom + 8 + menuHeight <= window.innerHeight - 12
      const top = below ? rect.bottom + 8 : Math.max(12, rect.top - menuHeight - 8)
      setPosition({ left, top, width })
      menuRef.current?.querySelector('textarea')?.focus()
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

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
    <div className={`inline-flex ${className}`}>
      <button ref={triggerRef} type="button" className="btn-ghost btn-sm inline-flex items-center gap-2"
        aria-expanded={open} aria-haspopup="dialog" aria-controls={textareaId}
        onClick={() => { setOpen((value) => !value); setMessage('') }}>
        <Icon name="share" size={16} />
        Share message & post
      </button>
      {open && createPortal(
        <div ref={menuRef} id={textareaId} role="dialog" aria-label="Share message and link"
          className="fixed z-50 grid max-h-[calc(100dvh-24px)] gap-1 overflow-y-auto rounded-xl border-2 border-ink bg-white p-3 text-left shadow-sticker"
          style={position || { left: 12, top: 12, width: 'min(20rem, calc(100vw - 24px))' }}>
          <label htmlFor={`${textareaId}-text`} className="px-1 text-sm font-bold">Message to share or post</label>
          <textarea
            id={`${textareaId}-text`}
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
        </div>,
        document.body,
      )}
    </div>
  )
}
