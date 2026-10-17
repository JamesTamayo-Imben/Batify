import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Envelope3D, { useEnvelope } from '../components/Envelope3D'
import Icon from '../components/Icon'
import Turnstile from '../components/Turnstile'
import { postJSON } from '../lib/ajax'
import { SLOTS } from '../lib/ads'
import { fireConfetti } from '../lib/confetti'
import { fromLocalInput } from '../lib/dates'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { error as buzzError, success, tap } from '../lib/haptics'
import { rememberPage } from '../lib/mypages'
import { copyText, shareLink } from '../lib/share'
import { qrPng, qrSvg } from '../lib/qr'
import { THEMES } from '../lib/themes'
import useTitle from '../lib/useTitle'

const STEPS = ['About you', 'Your letter', 'The surprise', 'Seal it']
const STARTERS = ['Thank you for', 'This year I learned', 'The best part of my year was', 'My wish for next year is']
const GCASH_RE = /^(09|\+639|639)\d{9}$/
const EMPTY = { ownerName: '', title: '', letter: '', birthdayDate: '', revealAt: '', gcashNumber: '', theme: 'confetti' }

function Field({ id, label, hint, error, optional, children }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</label>
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm font-semibold text-flag">{error}</p> : hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
    </div>
  )
}

/* --------------------------------------------------------------- result screen */
function LinkCard({ title, url, tone, warning, actions }) {
  const [copied, setCopied] = useState(false)
  async function copy() { if (await copyText(url)) { setCopied(true); setTimeout(() => setCopied(false), 1800) } }
  return (
    <div className={`card ${tone === 'warn' ? 'bg-sun/30' : ''}`}>
      <h2 className="text-2xl">{title}</h2>
      {warning && <p role="note" className="mt-2 flex gap-2 rounded-lg bg-ink p-3 text-sm font-semibold text-white"><Icon name="alert" size={18} className="mt-0.5" />{warning}</p>}
      <input readOnly value={url} onFocus={(e) => e.target.select()} className="field mt-3" aria-label={title} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy link'}</button>
        {actions}
      </div>
    </div>
  )
}

function Result({ result, f }) {
  const publicUrl = `${location.origin}/p/${result.slug}`
  const editUrl = `${location.origin}/edit/${result.editToken}`
  const [sealed, setSealed] = useState(false)
  const [svg, setSvg] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const env = useEnvelope({ max: 3, initial: 3, onStep: (n) => { if (n === 0) { setSealed(true); fireConfetti({ x: 0.5, y: 0.45, count: 160 }) } } })

  useEffect(() => { const t = setTimeout(env.close, 700); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { qrSvg(publicUrl, { size: 200 }).then(setSvg).catch(() => {}) }, [publicUrl])

  async function downloadQr() {
    const a = document.createElement('a')
    a.href = await qrPng(publicUrl); a.download = `batify-${result.slug}.png`; a.click()
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(`Send me a birthday wish: ${publicUrl}`)}`
  const mail = `mailto:?subject=${encodeURIComponent('My Batify edit link')}&body=${encodeURIComponent(`Keep this private. It is the only way to manage my birthday page:\n${editUrl}`)}`

  return (
    <div>
      <section data-theme={f.theme} className="border-b-2 border-ink bg-ground px-4 pb-16 pt-20 text-center">
        <Envelope3D step={env.step} initial={(f.ownerName.trim()[0] || 'B').toUpperCase()} still size="min(74vw, 340px)">
          <div className="t">{f.title}</div><div className="s">With love, {f.ownerName}</div><div className="lines" />
        </Envelope3D>
        <h1 className="mt-16 text-4xl sm:text-5xl" aria-live="polite">{sealed ? 'Sealed and live' : 'Sealing your letter'}</h1>
        <p className="mx-auto mt-3 max-w-md text-lg">Share the public link. Keep the edit link safe.</p>
      </section>

      <div className="page-wrap space-y-5">
        <LinkCard title="Public link" url={publicUrl} actions={
          <>
            <button className="btn-ghost" onClick={async () => { const r = await shareLink({ title: f.title, text: 'Send me a birthday wish', url: publicUrl }); if (r === 'copied') setShareMsg('Link copied to clipboard.') }}><Icon name="share" size={18} />Share</button>
            <a className="btn-ghost" href={wa} target="_blank" rel="noreferrer noopener"><Icon name="chat" size={18} />WhatsApp</a>
            <Link to={`/p/${result.slug}`} className="btn-ghost">Preview page</Link>
          </>
        } />
        {shareMsg && <p role="status" className="text-sm text-muted">{shareMsg}</p>}

        <LinkCard tone="warn" title="Edit link, only for you" warning="This is your only way back in. It cannot be recovered." url={editUrl} actions={
          <>
            <a className="btn-ghost" href={mail}><Icon name="mail" size={18} />Email it to myself</a>
            <Link to={`/edit/${result.editToken}`} className="btn-ghost">Open dashboard</Link>
          </>
        } />

        <div className="card flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-[200px] w-[200px] shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-white" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label="QR code for your public link" />
          <div>
            <h2 className="text-2xl">Print it on a card</h2>
            <p className="mt-1 text-muted">Scan to open your letter. Stick it on a card, a cake topper, or a gift box.</p>
            <button className="btn-ghost mt-3" onClick={downloadQr}><Icon name="download" size={18} />Download QR</button>
          </div>
        </div>
      </div>
      <AdSlot slot={SLOTS.create} />
    </div>
  )
}

/* ------------------------------------------------------------------ the wizard */
export default function Create() {
  useTitle('Write your birthday letter - Batify')
  const [f, setF] = useState(() => ({ ...EMPTY, ...(loadDraft() || {}) }))
  const [wiz, setWiz] = useState(0)
  const [errs, setErrs] = useState({})
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const ts = useRef(null)
  const letterRef = useRef(null)
  const heading = useRef(null)
  const env = useEnvelope({ max: 3 })

  useEffect(() => { saveDraft(f) }, [f])
  useEffect(() => { env.goTo(wiz === 1 ? 3 : 0) }, [wiz]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (wiz > 0) heading.current?.focus() }, [wiz])

  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErrs((p) => ({ ...p, [k]: '' })) }

  function validate(i) {
    const e = {}
    if (i === 0) {
      if (!f.ownerName.trim()) e.ownerName = 'Add your name so friends know whose letter this is.'
      if (!f.title.trim()) e.title = 'Give the page a title, like "Maria turns 25".'
      if (!f.birthdayDate) e.birthdayDate = 'Pick your birthday.'
    }
    if (i === 1 && f.letter.trim().length < 10) e.letter = 'Write at least a couple of sentences.'
    if (i === 2) {
      if (f.gcashNumber.trim() && !GCASH_RE.test(f.gcashNumber.replace(/[\s-]/g, ''))) e.gcashNumber = 'Use a PH mobile number, like 09171234567.'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }
  const next = () => { if (validate(wiz)) { tap(); setWiz((w) => w + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) } }
  const back = () => { setWiz((w) => Math.max(0, w - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  function addStarter(s) {
    setF((p) => ({ ...p, letter: `${p.letter}${p.letter && !p.letter.endsWith('\n') ? '\n\n' : ''}${s} ` }))
    setErrs((p) => ({ ...p, letter: '' }))
    requestAnimationFrame(() => { const el = letterRef.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } })
  }

  async function submit(e) {
    e.preventDefault()
    if (busy || !token) return
    setBusy(true); setError('')
    try {
      const data = await postJSON('create-page', {
        turnstileToken: token, ownerName: f.ownerName.trim(), title: f.title.trim(), letter: f.letter.trim(),
        birthdayDate: f.birthdayDate, revealAt: fromLocalInput(f.revealAt), gcashNumber: f.gcashNumber.trim() || undefined, theme: f.theme,
      })
      rememberPage({ slug: data.slug, token: data.editToken, title: f.title.trim() })
      clearDraft(); success(); setResult(data); window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err.message); buzzError(); ts.current?.reset()
    } finally { setBusy(false) }
  }

  if (result) return <Result result={result} f={f} />

  const first = f.ownerName.trim().split(/\s+/)[0]
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14 lg:py-12">
      <div>
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === wiz ? 'step' : undefined}>
              <div className={`h-2 rounded-full border-2 border-ink ${i < wiz ? 'bg-ink' : i === wiz ? 'bg-sun' : 'bg-white'}`} />
              <span className={`mt-1.5 hidden text-sm sm:block ${i === wiz ? 'font-bold' : 'text-muted'}`}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mb-1 text-sm font-bold text-muted sm:hidden">Step {wiz + 1} of 4</p>
        <h1 ref={heading} tabIndex={-1} className="text-4xl outline-none sm:text-5xl">{['Who is this letter from?', 'Say what you want to say', 'Add a little surprise', 'Seal the envelope'][wiz]}</h1>

        <form onSubmit={submit} className="mt-7 space-y-6" noValidate>
          {wiz === 0 && (
            <>
              <Field id="ownerName" label="Your name" error={errs.ownerName}>
                <input id="ownerName" className="field" maxLength={60} value={f.ownerName} onChange={set('ownerName')} placeholder="Maria Santos" autoComplete="name" aria-invalid={!!errs.ownerName} aria-describedby={errs.ownerName ? 'ownerName-err' : undefined} />
              </Field>
              <Field id="title" label="Page title" error={errs.title} hint="This is the headline on the envelope.">
                <input id="title" className="field" maxLength={120} value={f.title} onChange={set('title')} placeholder={first ? `${first} turns 25` : 'Maria turns 25'} aria-invalid={!!errs.title} aria-describedby={`title-${errs.title ? 'err' : 'hint'}`} />
              </Field>
              <Field id="birthdayDate" label="Birthday" error={errs.birthdayDate}>
                <input id="birthdayDate" type="date" className="field" value={f.birthdayDate} onChange={set('birthdayDate')} aria-invalid={!!errs.birthdayDate} aria-describedby={errs.birthdayDate ? 'birthdayDate-err' : undefined} />
              </Field>
            </>
          )}

          {wiz === 1 && (
            <>
              <Field id="letter" label="Your letter" error={errs.letter}>
                <textarea ref={letterRef} id="letter" className="field min-h-[240px] font-letter text-lg leading-relaxed" maxLength={8000} value={f.letter} onChange={set('letter')} placeholder="Dear friends and family..." aria-invalid={!!errs.letter} aria-describedby={errs.letter ? 'letter-err' : 'letter-count'} />
                <p id="letter-count" className="hint text-right">{f.letter.length} / 8000</p>
              </Field>
              <div>
                <p className="label">Stuck? Start with one of these</p>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => <button key={s} type="button" onClick={() => addStarter(s)} className="min-h-[44px] rounded-full border-2 border-ink bg-white px-4 text-sm font-bold hover:bg-sun">{s}...</button>)}
                </div>
              </div>
            </>
          )}

          {wiz === 2 && (
            <>
              <fieldset>
                <legend className="label">Envelope colors</legend>
                <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Envelope colors">
                  {Object.entries(THEMES).map(([id, t]) => (
                    <button key={id} type="button" role="radio" aria-checked={f.theme === id} onClick={() => { tap(); setF((p) => ({ ...p, theme: id })) }}
                      className={`flex min-h-[64px] items-center gap-3 rounded-xl border-2 border-ink p-3 text-left ${f.theme === id ? 'bg-sun shadow-sticker' : 'bg-white'}`}>
                      <span className="flex -space-x-2" aria-hidden="true">{t.swatch.map((c) => <span key={c} className="h-8 w-8 rounded-full border-2 border-ink" style={{ background: c }} />)}</span>
                      <span><span className="block font-bold">{t.label}</span></span>
                      {f.theme === id && <Icon name="check" className="ml-auto" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field id="revealAt" label="Reveal wishes at" optional hint="Wishes stay hidden behind a countdown until this time. Leave it empty to show them right away.">
                <input id="revealAt" type="datetime-local" className="field" value={f.revealAt} onChange={set('revealAt')} aria-describedby="revealAt-hint" />
                {f.birthdayDate && <button type="button" className="link mt-2 min-h-[44px] text-sm" onClick={() => setF((p) => ({ ...p, revealAt: `${p.birthdayDate}T00:00` }))}>Use midnight on my birthday</button>}
              </Field>
              <Field id="gcash" label="GCash number" optional error={errs.gcashNumber} hint="Friends can send you a little extra. You confirm each payment yourself.">
                <input id="gcash" inputMode="tel" className="field" value={f.gcashNumber} onChange={set('gcashNumber')} placeholder="09171234567" maxLength={16} aria-invalid={!!errs.gcashNumber} aria-describedby={`gcash-${errs.gcashNumber ? 'err' : 'hint'}`} />
              </Field>
            </>
          )}

          {wiz === 3 && (
            <>
              <dl className="card divide-y-2 divide-ink/10 !p-0">
                {[['From', f.ownerName], ['Title', f.title], ['Birthday', f.birthdayDate], ['Wishes', f.revealAt ? `Hidden until ${new Date(f.revealAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Visible right away'], ['GCash', f.gcashNumber || 'Off']].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[96px_1fr] gap-3 px-5 py-3"><dt className="font-bold text-muted">{k}</dt><dd className="min-w-0 break-words font-semibold">{v}</dd></div>
                ))}
              </dl>
              <Turnstile ref={ts} onToken={setToken} onError={setError} />
              {error && <p role="alert" className="rounded-lg border-2 border-flag bg-red-50 p-3 text-sm font-semibold text-flag">{error}</p>}
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            {wiz > 0 && <button type="button" className="btn-ghost" onClick={back} disabled={busy}><Icon name="back" size={18} />Back</button>}
            {wiz < 3 ? (
              <button type="button" className="btn-primary ml-auto" onClick={next}>Continue</button>
            ) : (
              <button type="submit" className="btn-primary ml-auto" disabled={busy || !token}>{busy ? 'Sealing...' : 'Seal and create my page'}</button>
            )}
          </div>
          <p className="text-sm text-muted">Your draft saves on this device as you type.</p>
        </form>
      </div>

      <aside aria-label="Envelope preview" className="lg:sticky lg:top-24 lg:self-start">
        <div data-theme={f.theme} className="grid place-items-center overflow-hidden rounded-3xl border-2 border-ink bg-ground px-4 pb-14 pt-24">
          <Envelope3D step={env.step} initial={(f.ownerName.trim()[0] || 'B').toUpperCase()} size="min(70vw, 320px)" still={wiz === 1}>
            <div className="t">{f.title || 'Your title'}</div>
            {env.step >= 3 ? <p className="body" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.letter || 'Your letter appears here as you write it.'}</p> : <div className="s">With love, {f.ownerName || 'you'}</div>}
          </Envelope3D>
        </div>
        <p className="mt-3 text-center text-sm text-muted">This is how friends will see your envelope.</p>
      </aside>
    </div>
  )
}
