import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Banderitas from '../components/Banderitas'
import Envelope3D, { useEnvelope } from '../components/Envelope3D'
import FlipCountdown from '../components/FlipCountdown'
import GiftBox3D from '../components/GiftBox3D'
import GiftPicker from '../components/GiftPicker'
import GiftArt from '../components/art/GiftArt'
import Icon from '../components/Icon'
import { LogoMark } from '../components/Logo'
import ReportWish from '../components/ReportWish'
import Turnstile from '../components/Turnstile'
import NotFound from './NotFound'
import { SLOTS } from '../lib/ads'
import { postForm, postJSON } from '../lib/ajax'
import { fireConfetti } from '../lib/confetti'
import { formatDate, formatDateTime, formatShort } from '../lib/dates'
import { formatBytes, validateImage, validateMedia, MEDIA_TYPES, IMAGE_TYPES } from '../lib/files'
import { giftLabel } from '../lib/gifts'
import { error as buzzError, success, tap } from '../lib/haptics'
import { clearUnwrapped, hasOpened, markOpened, markUnwrapped, wishUnwrapped } from '../lib/opened'
import { copyText, shareLink } from '../lib/share'
import { sb, PAGE_COLUMNS, WISH_COLUMNS } from '../lib/supabase'
import { themeOf } from '../lib/themes'
import useTitle from '../lib/useTitle'

const isRevealed = (page) => !page.reveal_at || new Date(page.reveal_at).getTime() <= Date.now()
const initialOf = (name) => (name.trim()[0] || 'B').toUpperCase()

/* ------------------------------------------------------------ opening ceremony */
function Ceremony({ page, onFinish }) {
  const [phase, setPhase] = useState('idle') // idle | rising | done
  const root = useRef(null)
  const env = useEnvelope({
    max: 4,
    onStep: (n) => {
      if (n === 3) fireConfetti({ x: 0.5, y: 0.35, count: 110, power: 0.9 })
      if (n === 4) {
        setPhase('rising')
        setTimeout(() => { setPhase('done'); onFinish() }, 1000)
      }
    },
  })

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root.current?.focus({ preventScroll: true })
    return () => { document.body.style.overflow = prev }
  }, [])

  const skip = () => { setPhase('done'); onFinish() }
  return (
    <div ref={root} tabIndex={-1} className={`ceremony ${phase === 'rising' ? 'is-rising' : ''} ${phase === 'done' ? 'is-done' : ''}`} role="dialog" aria-modal="true" aria-label={`A letter from ${page.owner_name}`}>
      <Banderitas className="absolute inset-x-0 top-0" count={11} />
      <button type="button" onClick={skip} className="btn-ghost btn-sm absolute bottom-6 right-4 z-30">Skip</button>
      <div className="ceremony-stage text-center">
        <Envelope3D step={env.step} initial={initialOf(page.owner_name)} interactive onActivate={env.open} label={`Open the letter from ${page.owner_name}`} still={env.step > 0}>
          <div className="t">{page.title}</div>
          <div className="s">With love, {page.owner_name}</div>
          <div className="lines" />
        </Envelope3D>
        <div className="mt-16 min-h-[4.5rem] px-4" aria-live="polite">
          {env.step === 0 && (
            <>
              <p className="font-display text-3xl font-extrabold sm:text-4xl">A letter from {page.owner_name.split(' ')[0]}</p>
              <p className="mt-1 text-lg font-semibold">Tap the seal to open it</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- wishes */
function WishCard({ wish, animate, closing, onWrap }) {
  return (
    <article className={`${animate ? 'unwrap-card' : ''} ${closing ? 'wrap-card' : ''} rounded-2xl border-2 border-ink bg-white p-5 shadow-sticker`}>
      <div className="flex items-center gap-3">
        <GiftArt id={wish.gift_type} className="h-14 w-14 shrink-0" label={giftLabel(wish.gift_type)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-extrabold">{wish.sender_name}</p>
          <p className="text-sm text-muted">{formatShort(wish.created_at)}</p>
        </div>
      </div>
      {wish.message && <p className="mt-3 whitespace-pre-wrap break-words font-letter text-lg leading-relaxed">{wish.message}</p>}
      {wish.media_url && wish.media_type === 'image' && <img src={wish.media_url} alt={`Gift from ${wish.sender_name}`} loading="lazy" className="mt-3 w-full rounded-xl border-2 border-ink object-cover" />}
      {wish.media_url && wish.media_type === 'video' && <video src={wish.media_url} controls playsInline preload="metadata" className="mt-3 w-full rounded-xl border-2 border-ink bg-black" />}
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onWrap} disabled={closing}>Wrap gift</button>
        <ReportWish wishId={wish.id} />
      </div>
    </article>
  )
}

export function WishItem({ wish, index, bulkAction, bulkToken, fresh }) {
  const [open, setOpen] = useState(() => wishUnwrapped(wish.id))
  const [lid, setLid] = useState(false)
  const [closing, setClosing] = useState(false)
  const btn = useRef(null)
  const openTimer = useRef(0)
  const wrapTimer = useRef(0)
  const lastBulkToken = useRef(bulkToken)

  const unwrap = useCallback(() => {
    if (open || lid || closing) return
    setLid(true); tap()
    openTimer.current = setTimeout(() => {
      markUnwrapped(wish.id); setOpen(true)
      const r = btn.current?.getBoundingClientRect()
      if (r) fireConfetti({ x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, count: 36, power: 0.55 })
    }, 650)
  }, [open, lid, closing, wish.id])
  const wrap = useCallback(() => {
    if (closing || (!open && !lid)) return
    clearTimeout(openTimer.current)
    if (!open) {
      setLid(false)
      return
    }
    setClosing(true)
    wrapTimer.current = setTimeout(() => {
      clearUnwrapped(wish.id)
      setOpen(false); setLid(false); setClosing(false)
    }, 450)
  }, [open, lid, closing, wish.id])
  const actions = useRef({ unwrap, wrap })
  actions.current = { unwrap, wrap }

  useEffect(() => {
    if (bulkToken === lastBulkToken.current) return
    lastBulkToken.current = bulkToken
    const timer = setTimeout(() => actions.current[bulkAction]?.(), Math.min(index, 10) * 130)
    return () => clearTimeout(timer)
  }, [bulkAction, bulkToken, index])
  useEffect(() => () => {
    clearTimeout(openTimer.current)
    clearTimeout(wrapTimer.current)
  }, [])

  if (open) return <WishCard wish={wish} animate={lid} closing={closing} onWrap={wrap} />
  return (
    <button ref={btn} type="button" onClick={unwrap} aria-label={`Unwrap the gift from ${wish.sender_name}`}
      className={`${fresh ? 'drop-in' : ''} group flex min-h-[210px] flex-col items-center justify-end rounded-2xl border-2 border-ink bg-white px-4 pb-4 pt-8 text-center shadow-sticker transition-transform hover:-translate-y-1`}>
      <GiftBox3D gift={wish.gift_type} size={92} open={lid} />
      <span className="mt-8 block max-w-full truncate font-display text-xl font-extrabold">{wish.sender_name}</span>
      <span className="text-sm font-semibold text-muted">Tap to unwrap</span>
    </button>
  )
}

/* ------------------------------------------------------------- send wish form */
function Sent({ gift, text, onAgain }) {
  const [open, setOpen] = useState(true)
  useEffect(() => {
    const a = setTimeout(() => setOpen(false), 350)
    const b = setTimeout(() => fireConfetti({ x: 0.5, y: 0.7, count: 90, power: 0.8 }), 1000)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  return (
    <div className="card pt-10 text-center" role="status">
      <GiftBox3D gift={gift} size={104} open={open} />
      <h3 className="mt-8 text-3xl">Wrapped and sent</h3>
      <p className="mx-auto mt-2 max-w-md text-muted">{text}</p>
      <button className="btn-ghost mt-5" onClick={onAgain}>Send another</button>
    </div>
  )
}

function SendWishForm({ page, revealed }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [gift, setGift] = useState('flower')
  const [file, setFile] = useState(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileErr, setFileErr] = useState('')
  const [sent, setSent] = useState(null)
  const ts = useRef(null)

  async function submit(e) {
    e.preventDefault()
    if (busy || !token) return
    if (gift === 'media') { const m = validateMedia(file); if (m) { setFileErr(m); return } }
    setBusy(true); setError('')
    try {
      const fd = new FormData()
      fd.set('mode', 'wish'); fd.set('turnstileToken', token); fd.set('slug', page.slug)
      fd.set('senderName', name.trim()); fd.set('message', message.trim()); fd.set('giftType', gift)
      if (gift === 'media' && file) fd.set('file', file)
      const data = await postForm('send-wish', fd)
      success(); setSent(data.wish)
    } catch (err) { setError(err.message); buzzError(); ts.current?.reset() } finally { setBusy(false) }
  }
  const again = () => { setSent(null); setMessage(''); setFile(null); setToken(''); setError('') }

  if (sent) {
    const text = sent.is_approved
      ? revealed ? `Your wish is now on ${page.owner_name}'s page.` : `Saved. It will appear when the page is revealed on ${formatDateTime(page.reveal_at)}.`
      : `Thank you. ${page.owner_name} will review it before it appears on the page.`
    return <Sent gift={gift} text={text} onAgain={again} />
  }

  return (
    <form onSubmit={submit} className="card space-y-5">
      <div>
        <span className="label" id="pick-l">1. Pick a gift</span>
        <GiftPicker value={gift} onChange={(g) => { setGift(g); setError(''); setFileErr('') }} disabled={busy} />
      </div>
      {gift === 'media' && (
        <div>
          <label className="label" htmlFor="gift-file">Photo or video <span className="font-normal text-muted">(up to 25 MB)</span></label>
          <input id="gift-file" type="file" accept={MEDIA_TYPES.join(',')} aria-invalid={!!fileErr} aria-describedby={fileErr ? 'gift-file-err' : undefined}
            className="field file:mr-3 file:rounded-lg file:border-0 file:bg-sun file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ink"
            onChange={(e) => { const f = e.target.files?.[0] || null; setFile(f); setFileErr(f ? validateMedia(f) || '' : '') }} />
          {file && !fileErr && <p className="hint">{file.name}, {formatBytes(file.size)}</p>}
          {fileErr && <p id="gift-file-err" role="alert" className="mt-1.5 text-sm font-semibold text-flag">{fileErr}</p>}
        </div>
      )}
      <div>
        <label className="label" htmlFor="senderName">2. Your name</label>
        <input id="senderName" className="field" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan" autoComplete="given-name" />
      </div>
      <div>
        <label className="label" htmlFor="message">3. Your wish <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="message" className="field min-h-[120px] font-letter text-lg" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Happy birthday, ${page.owner_name.split(' ')[0]}!`} aria-describedby="msg-hint" />
        <p id="msg-hint" className="hint">Links are removed from wishes.</p>
      </div>
      <Turnstile ref={ts} onToken={setToken} onError={setError} />
      {error && <p role="alert" className="rounded-lg border-2 border-flag bg-red-50 p-3 text-sm font-semibold text-flag">{error}</p>}
      <button type="submit" className="btn-primary w-full py-3.5 text-lg" disabled={busy || !token}>{busy ? (gift === 'media' ? 'Uploading...' : 'Sending...') : 'Send wish'}</button>
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
    setBusy(true); setError('')
    try {
      const fd = new FormData()
      fd.set('mode', 'contribution'); fd.set('turnstileToken', token); fd.set('slug', page.slug)
      fd.set('senderName', name.trim()); fd.set('amount', amount); fd.set('proof', proof)
      await postForm('send-wish', fd)
      success(); setDone(true); fireConfetti({ x: 0.5, y: 0.8, count: 70, power: 0.7 })
    } catch (err) { setError(err.message); buzzError(); ts.current?.reset() } finally { setBusy(false) }
  }

  return (
    <section aria-labelledby="gcash-h" className="card space-y-4 !bg-[#E9F1FF]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white"><Icon name="wallet" /></span>
        <div>
          <h2 id="gcash-h" className="text-2xl">Send a little extra by GCash</h2>
          <p className="mt-1 text-muted">Send to the number below, then upload your screenshot so {page.owner_name.split(' ')[0]} can confirm it.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-ink bg-white p-3">
        <span className="font-mono text-xl font-bold tracking-wide">{page.gcash_number}</span>
        <button type="button" className="btn-ghost btn-sm" onClick={async () => { if (await copyText(page.gcash_number)) { setCopied(true); setTimeout(() => setCopied(false), 1500) } }}>
          <Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copied' : 'Copy number'}
        </button>
      </div>
      {page.gcash_qr_url && <img src={page.gcash_qr_url} alt={`GCash QR code for ${page.owner_name}`} loading="lazy" className="mx-auto w-56 max-w-full rounded-xl border-2 border-ink bg-white" />}

      {done ? (
        <div role="status" className="rounded-xl border-2 border-ink bg-white p-4 text-center font-bold">Thank you. {page.owner_name.split(' ')[0]} will confirm your payment.</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="gc-name">Your name</label><input id="gc-name" className="field" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label" htmlFor="gc-amount">Amount (PHP)</label><input id="gc-amount" className="field" required type="number" inputMode="decimal" min="1" max="100000" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>
          <div>
            <label className="label" htmlFor="gc-proof">Payment screenshot</label>
            <input id="gc-proof" required type="file" accept={IMAGE_TYPES.join(',')} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-sun file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ink"
              onChange={(e) => { const f = e.target.files?.[0] || null; setProof(f); setError(f ? validateImage(f) || '' : '') }} />
          </div>
          <Turnstile ref={ts} onToken={setToken} onError={setError} />
          {error && <p role="alert" className="rounded-lg border-2 border-flag bg-red-50 p-3 text-sm font-semibold text-flag">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy || !token}>{busy ? 'Uploading...' : 'Submit payment proof'}</button>
        </form>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------- the page */
export default function PublicPage() {
  const { slug } = useParams()
  const [status, setStatus] = useState('loading')
  const [page, setPage] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wishes, setWishes] = useState([])
  const [fresh, setFresh] = useState(() => new Set())
  const [note, setNote] = useState('')
  const [ceremony, setCeremony] = useState(false)
  const [justOpened, setJustOpened] = useState(false)
  const [bulkCommand, setBulkCommand] = useState({ action: null, token: 0 })
  const loaded = useRef(false)

  useTitle(page ? `${page.title} - Batify` : 'Batify')

  useEffect(() => {
    let dead = false
    setStatus('loading'); setPage(null); setWishes([]); loaded.current = false
    sb.from('pages').select(PAGE_COLUMNS).eq('slug', slug).maybeSingle().then(({ data, error }) => {
      if (dead) return
      if (error) return setStatus('error')
      if (!data) return setStatus('missing')
      setPage(data); setRevealed(isRevealed(data)); setCeremony(!hasOpened(data.slug)); setStatus('ready')
    })
    return () => { dead = true }
  }, [slug])

  useEffect(() => {
    if (!page || !revealed) return
    let dead = false
    sb.from('wishes').select(WISH_COLUMNS).eq('page_id', page.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (!dead && data) { setWishes(data); loaded.current = true } })
    const add = (w) => {
      if (!w?.is_approved) return
      setWishes((cur) => (cur.some((x) => x.id === w.id) ? cur : [w, ...cur]))
      if (loaded.current) setFresh((s) => new Set(s).add(w.id))
    }
    const channel = sb.channel(`wishes:${page.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishes', filter: `page_id=eq.${page.id}` }, (p) => add(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wishes', filter: `page_id=eq.${page.id}` }, (p) => add(p.new))
      .subscribe()
    return () => { dead = true; sb.removeChannel(channel) }
  }, [page, revealed])

  const onCountdownDone = useCallback(() => { setRevealed(true); fireConfetti({ x: 0.5, y: 0.5, count: 180 }) }, [])
  const runBulkAction = (action) => setBulkCommand(({ token }) => ({ action, token: token + 1 }))

  const finishCeremony = useCallback(() => {
    markOpened(slug)
    setJustOpened(true)
    postJSON('track-open', { slug }).catch(() => {}) // best effort; never blocks the reader
    setTimeout(() => setCeremony(false), 950)
  }, [slug])

  if (status === 'loading') {
    return (
      <div data-theme="confetti" className="grid min-h-dvh place-items-center bg-ground text-center">
        <div><div className="animate-pulse"><LogoMark size={64} /></div><p className="mt-4 text-lg font-bold">Fetching your letter</p></div>
      </div>
    )
  }
  if (status === 'missing') return <NotFound message="This birthday page doesn't exist or isn't published." />
  if (status === 'error') return <NotFound message="We couldn't load this page. Please try again." />

  const first = page.owner_name.split(' ')[0]
  return (
    <div data-theme={themeOf(page.theme)} className="min-h-dvh bg-paper">
      {ceremony && <Ceremony page={page} onFinish={finishCeremony} />}

      <header className="relative overflow-hidden border-b-2 border-ink bg-ground px-4 pb-24 pt-28 text-center">
        <Banderitas className="absolute inset-x-0 top-0" count={11} />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-lg font-bold">{formatDate(page.birthday_date)}</p>
          <h1 className="mt-2 text-balance text-5xl sm:text-6xl">{page.title}</h1>
          <button className="btn-ghost btn-sm mt-6" onClick={async () => {
            const r = await shareLink({ title: page.title, text: `Send ${first} a birthday wish`, url: location.href })
            setNote(r === 'copied' ? 'Link copied.' : r === 'failed' ? 'Could not share. Copy the address from your browser.' : '')
            if (r === 'copied') setTimeout(() => setNote(''), 2000)
          }}><Icon name="share" size={16} />Share this page</button>
          {note && <p role="status" className="mt-2 text-sm font-semibold">{note}</p>}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-14 px-4 pb-16 sm:px-6">
        <section aria-label="Letter" className={`relative -mt-14 ${justOpened ? 'paper-in' : ''}`}>
          <span aria-hidden="true" className="absolute -top-3 left-8 h-7 w-20 -rotate-6 border border-ink/20 bg-sun/80" />
          <span aria-hidden="true" className="absolute -top-3 right-8 h-7 w-20 rotate-6 border border-ink/20 bg-sun/80" />
          <div className="-rotate-[.4deg] rounded-md border-2 border-ink bg-white p-7 shadow-lift sm:p-12">
            <p className="whitespace-pre-wrap break-words font-letter text-xl leading-[1.75] sm:text-2xl sm:leading-[1.7]">{page.letter}</p>
            <p className="mt-8 text-right font-hand text-5xl text-accent">{page.owner_name}</p>
          </div>
        </section>

        {!revealed ? (
          <section aria-label="Wishes locked" className="rounded-3xl border-2 border-ink bg-ground p-6 text-center sm:p-10">
            <Icon name="lock" size={30} className="mx-auto" />
            <h2 className="mt-2 text-3xl sm:text-4xl">Wishes unlock {formatDateTime(page.reveal_at)}</h2>
            <p className="mx-auto mb-7 mt-2 max-w-md">You can still send yours. It will be waiting.</p>
            <FlipCountdown target={page.reveal_at} onDone={onCountdownDone} />
          </section>
        ) : (
          <section aria-labelledby="wishes-h">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 id="wishes-h" className="text-3xl sm:text-4xl">{wishes.length ? `${wishes.length} ${wishes.length === 1 ? 'wish' : 'wishes'} for ${first}` : 'Wishes'}</h2>
              {wishes.length > 0 && (
                <div className="flex gap-2">
                  <button type="button" className="btn-sun btn-sm" onClick={() => runBulkAction('unwrap')}><Icon name="gift" size={18} />Unwrap all</button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => runBulkAction('wrap')}><Icon name="gift" size={18} />Wrap all</button>
                </div>
              )}
            </div>
            {wishes.length === 0 ? (
              <div className="card text-center text-muted">No wishes yet. Be the first to send one below.</div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {wishes.map((w, i) => <WishItem key={w.id} wish={w} index={i} bulkAction={bulkCommand.action} bulkToken={bulkCommand.token} fresh={fresh.has(w.id)} />)}
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="send-h">
          <h2 id="send-h" className="mb-5 text-3xl sm:text-4xl">Send a wish to {first}</h2>
          <SendWishForm page={page} revealed={revealed} />
        </section>

        {page.gcash_number && <GcashSection page={page} />}

        <Link to="/create" className="card flex items-center gap-4 !bg-white transition-transform hover:-translate-y-0.5">
          <LogoMark size={44} />
          <span><span className="block font-display text-xl font-extrabold">Want a letter like this for your birthday?</span><span className="text-muted">Write yours in about three minutes. It is free.</span></span>
        </Link>
      </div>

      <AdSlot slot={SLOTS.public} />
    </div>
  )
}
