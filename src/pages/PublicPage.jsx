import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Countdown from '../components/Countdown'
import GiftPicker from '../components/GiftPicker'
import ReportWish from '../components/ReportWish'
import Turnstile from '../components/Turnstile'
import NotFound from './NotFound'
import { SLOTS } from '../lib/ads'
import { postForm } from '../lib/ajax'
import { formatDate, formatDateTime, formatShort } from '../lib/dates'
import { formatBytes, validateImage, validateMedia, MEDIA_TYPES, IMAGE_TYPES } from '../lib/files'
import { giftEmoji, giftLabel } from '../lib/gifts'
import { error as buzzError, success } from '../lib/haptics'
import { copyText, shareLink } from '../lib/share'
import { sb, PAGE_COLUMNS, WISH_COLUMNS } from '../lib/supabase'
import { themeOf } from '../lib/themes'
import useTitle from '../lib/useTitle'

const isRevealed = (page) => !page.reveal_at || new Date(page.reveal_at).getTime() <= Date.now()

/* ------------------------------------------------------------------ wish card */
function WishCard({ wish }) {
  return (
    <article className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-3xl" aria-label={giftLabel(wish.gift_type)} role="img">{giftEmoji(wish.gift_type)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-900">{wish.sender_name}</p>
          <p className="text-xs text-slate-400">{formatShort(wish.created_at)}</p>
        </div>
      </div>
      {wish.message && <p className="mt-3 whitespace-pre-wrap break-words font-display leading-relaxed text-slate-700">{wish.message}</p>}
      {wish.media_url && wish.media_type === 'image' && (
        <img src={wish.media_url} alt={`Gift from ${wish.sender_name}`} loading="lazy" className="mt-3 w-full rounded-xl object-cover" />
      )}
      {wish.media_url && wish.media_type === 'video' && (
        <video src={wish.media_url} controls playsInline preload="metadata" className="mt-3 w-full rounded-xl bg-black" />
      )}
      <div className="mt-3 flex justify-end"><ReportWish wishId={wish.id} /></div>
    </article>
  )
}

/* ------------------------------------------------------------- send wish form */
function SendWishForm({ page, revealed }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [gift, setGift] = useState('flower')
  const [file, setFile] = useState(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)
  const ts = useRef(null)

  async function submit(e) {
    e.preventDefault()
    if (busy || !token) return
    if (gift === 'media') {
      const msg = validateMedia(file)
      if (msg) return setError(msg)
    }
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.set('mode', 'wish')
      fd.set('turnstileToken', token)
      fd.set('slug', page.slug)
      fd.set('senderName', name.trim())
      fd.set('message', message.trim())
      fd.set('giftType', gift)
      if (gift === 'media' && file) fd.set('file', file)
      const data = await postForm('send-wish', fd)
      success()
      setSent(data.wish)
    } catch (err) {
      setError(err.message)
      buzzError()
      ts.current?.reset()
    } finally {
      setBusy(false)
    }
  }

  function again() {
    setSent(null); setMessage(''); setFile(null); setToken(''); setError('')
  }

  if (sent) {
    return (
      <div className="card text-center" role="status">
        <div className="animate-pop text-5xl" aria-hidden="true">{giftEmoji(gift)}</div>
        <h3 className="mt-2 text-2xl font-bold">Sent!</h3>
        <p className="mt-1 text-slate-600">
          {sent.is_approved
            ? revealed
              ? `Your wish is now on ${page.owner_name}'s page.`
              : `Your wish is saved and will appear when the page is revealed on ${formatDateTime(page.reveal_at)}.`
            : `Thank you! ${page.owner_name} will review it before it appears on the page.`}
        </p>
        <button className="btn-ghost mt-4" onClick={again}>Send another</button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="senderName">Your name</label>
        <input id="senderName" className="field" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan" autoComplete="given-name" />
      </div>
      <div>
        <label className="label" htmlFor="message">Your wish <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea id="message" className="field min-h-[110px]" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Happy birthday, ${page.owner_name.split(' ')[0]}!`} />
        <p className="hint">Links are removed from wishes.</p>
      </div>
      <div>
        <span className="label">Pick a gift</span>
        <GiftPicker value={gift} onChange={(g) => { setGift(g); setError('') }} disabled={busy} />
      </div>
      {gift === 'media' && (
        <div>
          <label className="label" htmlFor="gift-file">Photo or video <span className="font-normal text-slate-400">(max 25 MB)</span></label>
          <input id="gift-file" type="file" accept={MEDIA_TYPES.join(',')} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-600"
            onChange={(e) => { const f = e.target.files?.[0] || null; setFile(f); setError(f ? validateMedia(f) || '' : '') }} />
          {file && <p className="hint">{file.name} · {formatBytes(file.size)}</p>}
        </div>
      )}
      <Turnstile ref={ts} onToken={setToken} onError={setError} />
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={busy || !token}>
        {busy ? (gift === 'media' ? 'Uploading…' : 'Sending…') : 'Send wish 🎈'}
      </button>
    </form>
  )
}

/* -------------------------------------------------------------- GCash section */
function GcashSection({ page }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [proof, setProof] = useState(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const ts = useRef(null)

  async function submit(e) {
    e.preventDefault()
    if (busy || !token) return
    const msg = validateImage(proof)
    if (msg) return setError(`Payment screenshot: ${msg}`)
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.set('mode', 'contribution')
      fd.set('turnstileToken', token)
      fd.set('slug', page.slug)
      fd.set('senderName', name.trim())
      fd.set('amount', amount)
      fd.set('proof', proof)
      await postForm('send-wish', fd)
      success()
      setDone(true)
    } catch (err) {
      setError(err.message)
      buzzError()
      ts.current?.reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="gcash-h" className="card space-y-4">
      <div>
        <h2 id="gcash-h" className="text-xl font-bold">Send a little extra via GCash 💙</h2>
        <p className="mt-1 text-sm text-slate-600">
          Send to the number below, then upload your screenshot so {page.owner_name} can confirm it.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sky-50 p-3">
        <span className="font-mono text-lg font-bold text-sky-900">{page.gcash_number}</span>
        <button type="button" className="btn-ghost btn-sm" onClick={async () => { if (await copyText(page.gcash_number)) { setCopied(true); setTimeout(() => setCopied(false), 1500) } }}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      {page.gcash_qr_url && (
        <img src={page.gcash_qr_url} alt={`GCash QR code for ${page.owner_name}`} loading="lazy" className="mx-auto w-56 max-w-full rounded-xl border border-slate-200" />
      )}

      {done ? (
        <div role="status" className="rounded-xl bg-emerald-50 p-4 text-center text-emerald-800">
          <div className="text-3xl" aria-hidden="true">💙</div>
          <p className="font-semibold">Thank you! {page.owner_name} will confirm your payment.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="gc-name">Your name</label>
              <input id="gc-name" className="field" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="gc-amount">Amount (₱)</label>
              <input id="gc-amount" className="field" required type="number" inputMode="decimal" min="1" max="100000" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="gc-proof">Payment screenshot</label>
            <input id="gc-proof" required type="file" accept={IMAGE_TYPES.join(',')} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700"
              onChange={(e) => { const f = e.target.files?.[0] || null; setProof(f); setError(f ? validateImage(f) || '' : '') }} />
          </div>
          <Turnstile ref={ts} onToken={setToken} onError={setError} />
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || !token}>
            {busy ? 'Uploading…' : 'Submit payment proof'}
          </button>
        </form>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------- the page */
export default function PublicPage() {
  const { slug } = useParams()
  const [status, setStatus] = useState('loading') // loading | ready | missing | error
  const [page, setPage] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wishes, setWishes] = useState([])
  const [note, setNote] = useState('')

  useTitle(page ? `${page.title} — Batify` : 'Batify')

  // 1. load the page
  useEffect(() => {
    let dead = false
    setStatus('loading'); setPage(null); setWishes([])
    sb.from('pages').select(PAGE_COLUMNS).eq('slug', slug).maybeSingle().then(({ data, error }) => {
      if (dead) return
      if (error) return setStatus('error')
      if (!data) return setStatus('missing')
      setPage(data)
      setRevealed(isRevealed(data))
      setStatus('ready')
    })
    return () => { dead = true }
  }, [slug])

  // 2. once revealed: load wishes + subscribe to live updates
  useEffect(() => {
    if (!page || !revealed) return
    let dead = false
    sb.from('wishes').select(WISH_COLUMNS).eq('page_id', page.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (!dead && data) setWishes(data) })

    const add = (w) => {
      if (!w?.is_approved) return
      setWishes((cur) => (cur.some((x) => x.id === w.id) ? cur : [w, ...cur]))
    }
    const channel = sb
      .channel(`wishes:${page.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishes', filter: `page_id=eq.${page.id}` }, (p) => add(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wishes', filter: `page_id=eq.${page.id}` }, (p) => add(p.new))
      .subscribe()
    return () => { dead = true; sb.removeChannel(channel) }
  }, [page, revealed])

  const onCountdownDone = useCallback(() => setRevealed(true), [])

  if (status === 'loading') {
    return <div className="page-wrap text-center text-slate-500"><div className="animate-float text-5xl" aria-hidden="true">🎈</div><p className="mt-3">Opening your gift…</p></div>
  }
  if (status === 'missing') return <NotFound message="This birthday page doesn't exist or isn't published." />
  if (status === 'error') return <NotFound message="We couldn't load this page. Please try again." />

  const theme = themeOf(page.theme)

  return (
    <div className={`min-h-dvh bg-gradient-to-b ${theme.bg}`}>
      <header className="relative overflow-hidden px-4 pb-6 pt-10 text-center sm:pt-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none text-2xl opacity-50">
          <span className="absolute left-[6%] top-8 animate-float">🎈</span>
          <span className="absolute right-[8%] top-16 animate-float [animation-delay:1.5s]">🎉</span>
          <span className="absolute left-[14%] top-40 animate-float [animation-delay:3s]">✨</span>
          <span className="absolute right-[14%] top-3 animate-float [animation-delay:.8s]">🎂</span>
        </div>
        <div className="relative mx-auto max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">{formatDate(page.birthday_date)}</p>
          <h1 className="mt-2 animate-fade-up text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">{page.title}</h1>
          <button
            className="btn-ghost btn-sm mt-5"
            onClick={async () => {
              const r = await shareLink({ title: page.title, text: `Send ${page.owner_name} a birthday wish 🎈`, url: location.href })
              setNote(r === 'copied' ? 'Link copied!' : r === 'failed' ? 'Could not share — copy the address bar link.' : '')
              if (r === 'copied') setTimeout(() => setNote(''), 2000)
            }}
          >
            Share this page
          </button>
          {note && <p role="status" className="mt-2 text-xs text-slate-500">{note}</p>}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-8 px-4 pb-4 sm:px-6">
        {/* Letter */}
        <section aria-label="Letter" className="rounded-3xl border border-amber-100 bg-[#fffdf8] p-6 shadow-sm sm:p-10">
          <p className="whitespace-pre-wrap break-words font-display text-lg leading-8 text-slate-800 sm:text-xl sm:leading-9">{page.letter}</p>
          <p className="mt-6 text-right font-display text-lg italic text-brand-600">With love, {page.owner_name}</p>
        </section>

        {/* Wishes (locked or revealed) */}
        {!revealed ? (
          <section className="card text-center" aria-label="Wishes locked">
            <div className="text-3xl" aria-hidden="true">🔒</div>
            <h2 className="mt-1 text-2xl font-bold">Wishes are on their way</h2>
            <p className="mb-4 mt-1 text-sm text-slate-600">They unlock on {formatDateTime(page.reveal_at)}. You can still send yours — it'll be waiting.</p>
            <Countdown target={page.reveal_at} onDone={onCountdownDone} />
          </section>
        ) : (
          <section aria-label="Wishes">
            <h2 className="mb-4 text-2xl font-bold">💌 {wishes.length ? `${wishes.length} ${wishes.length === 1 ? 'wish' : 'wishes'}` : 'Wishes'}</h2>
            {wishes.length === 0 ? (
              <div className="card text-center text-slate-500">No wishes yet — be the first to send one.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {wishes.map((w) => <WishCard key={w.id} wish={w} />)}
              </div>
            )}
          </section>
        )}

        {/* Send form */}
        <section aria-labelledby="send-h">
          <h2 id="send-h" className="mb-4 text-2xl font-bold">Send a wish to {page.owner_name.split(' ')[0]}</h2>
          <SendWishForm page={page} revealed={revealed} />
        </section>

        {page.gcash_number && <GcashSection page={page} />}
      </div>

      {/* Only ad on this page: very bottom, never near the form or media */}
      <AdSlot slot={SLOTS.public} />
    </div>
  )
}
