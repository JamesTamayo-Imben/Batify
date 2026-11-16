import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Envelope3D, { useEnvelope } from '../components/Envelope3D'
import Icon from '../components/Icon'
import ShareOptions from '../components/ShareOptions'
import Turnstile from '../components/Turnstile'
import { postJSON } from '../lib/ajax'
import { SLOTS } from '../lib/ads'
import { fireConfetti } from '../lib/confetti'
import { formatDate, fromLocalInput } from '../lib/dates'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { CAMPAIGN_COLUMNS, isCampaignActive, isValidCampaignEventDate, occasionOf, upcomingCampaignDate } from '../lib/campaigns'
import { error as buzzError, success, tap } from '../lib/haptics'
import { rememberPage } from '../lib/mypages'
import { copyText } from '../lib/share'
import { containsBlockedLanguage, BLOCKED_LANGUAGE_MESSAGE } from '../lib/contentFilter'
import { recordHistory } from '../lib/history'
import { qrPng, qrSvg } from '../lib/qr'
import { sb } from '../lib/supabase'
import ThemePicker from '../components/ThemePicker'
import SeasonalOpener from '../components/SeasonalOpener'
import { themeOf, themeStyleOf } from '../lib/themes'
import useTitle from '../lib/useTitle'

const STEPS = ['About you', 'Your letter', 'The surprise', 'Seal it']
const CHRISTMAS_STEPS = ['About you', 'Your letter', 'The surprise', 'Wrap it up']
const CHRISTMAS_TREE_COLOR = '#176B45'
const CHRISTMAS_GIFT_BOX_COLOR = '#C92F20'
const STARTERS = ['Thank you for', 'This year I learned', 'The best part of my year was', 'My wish for next year is']
const GCASH_RE = /^(09|\+639|639)\d{9}$/
const EMPTY = {
  ownerName: '', title: '', letter: '', birthdayDate: '', revealAt: '', gcashNumber: '', theme: 'confetti',
  christmasTreeColor: CHRISTMAS_TREE_COLOR,
  christmasGiftBoxColor: CHRISTMAS_GIFT_BOX_COLOR,
}

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
function LinkCard({ title, url, tone, warning, hint, actions }) {
  const [copied, setCopied] = useState(false)
  async function copy() { if (await copyText(url)) { setCopied(true); setTimeout(() => setCopied(false), 1800) } }
  return (
    <div className={`card ${tone === 'warn' ? 'bg-sun/30' : ''}`}>
      <h2 className="text-2xl">{title}</h2>
      {warning && <p role="note" className="mt-2 flex gap-2 rounded-lg bg-ink p-3 text-sm font-semibold text-white"><Icon name="alert" size={18} className="mt-0.5" />{warning}</p>}
      <input readOnly value={url} onFocus={(e) => e.target.select()} className="field mt-3" aria-label={title} />
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy link'}</button>
        {actions}
      </div>
    </div>
  )
}

function Result({ result, f, campaign, onCreateAnother }) {
  const publicUrl = `${location.origin}/p/${result.slug}`
  const editUrl = `${location.origin}/edit/${result.editToken}`
  const [sealed, setSealed] = useState(false)
  const [svg, setSvg] = useState('')
  const env = useEnvelope({ max: 3, initial: 3, onStep: (n) => { if (n === 0) { setSealed(true); fireConfetti({ x: 0.5, y: 0.45, count: 160 }) } } })
  const eventTheme = campaign?.priorityTheme

  useEffect(() => { const t = setTimeout(env.close, 700); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { qrSvg(publicUrl, { size: 200 }).then(setSvg).catch(() => {}) }, [publicUrl])

  async function downloadQr() {
    const a = document.createElement('a')
    a.href = await qrPng(publicUrl); a.download = `batify-${result.slug}.png`; a.click()
  }
  const shareText = campaign?.shareText || 'Send me a birthday wish'
  const mail = `mailto:?subject=${encodeURIComponent('My Batify edit link')}&body=${encodeURIComponent(`Keep this private. It is the only way to manage my Batify page:\n${editUrl}`)}`

  return (
    <div>
      <section data-theme={eventTheme || themeOf(f.theme)} style={eventTheme ? undefined : themeStyleOf(f.theme)} className="border-b-2 border-ink bg-ground px-4 pb-16 pt-20 text-center">
        {eventTheme ? (
          <SeasonalOpener
            theme={eventTheme}
            title={f.title}
            letterText={f.letter}
            step={env.step}
            onActivate={env.open}
            className="seasonal-opener--hero"
            treeColor={f.christmasTreeColor}
            giftBoxColor={f.christmasGiftBoxColor}
          />
        ) : (
          <Envelope3D step={env.step} initial={(f.ownerName.trim()[0] || 'B').toUpperCase()} still size="min(74vw, 340px)">
            <div className="t">{f.title}</div><div className="s">With love, {f.ownerName}</div><div className="lines" />
          </Envelope3D>
        )}
        <h1 className="mt-16 text-4xl sm:text-5xl" aria-live="polite">
          {campaign?.id === 'christmas'
            ? sealed ? 'Wrapped and ready to share' : 'Wrapping your Christmas letter'
            : sealed ? 'Sealed and live' : 'Sealing your letter'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg">Share the public link. Keep the edit link safe.</p>
      </section>

      <div className="page-wrap space-y-5">
        <LinkCard title="Public link" url={publicUrl}
          hint={campaign ? `Your letter opens automatically on ${formatDate(f.birthdayDate)} at midnight Philippine time.` : undefined} actions={
          <>
            <ShareOptions title={f.title} text={shareText} url={publicUrl} />
            <Link to={`/p/${result.slug}`} className="btn-ghost">Preview page</Link>
          </>
        } />

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
      <div className="text-center">
        <button type="button" className="btn-ghost" onClick={onCreateAnother}>Create another letter</button>
      </div>
      <AdSlot slot={SLOTS.create} />
    </div>
  )
}

/* ------------------------------------------------------------------ the wizard */
export default function Create() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const campaignId = searchParams.get('campaign')
  const occasionType = searchParams.get('occasion')
  const [campaign, setCampaign] = useState(null)
  const [campaignStatus, setCampaignStatus] = useState(campaignId ? 'loading' : 'idle')
  const [campaignError, setCampaignError] = useState('')
  const [occasionOptions, setOccasionOptions] = useState([])
  const [occasionStatus, setOccasionStatus] = useState('loading')
  const [occasionError, setOccasionError] = useState('')
  const [f, setF] = useState(() => ({ ...EMPTY, ...(loadDraft() || {}) }))
  const [wiz, setWiz] = useState(0)
  const [errs, setErrs] = useState({})
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [resultForm, setResultForm] = useState(null)
  const ts = useRef(null)
  const letterRef = useRef(null)
  const heading = useRef(null)
  const env = useEnvelope({ max: 3 })
  useEffect(() => {
    if (campaignId || occasionType) {
      recordHistory('writing', 'Started writing a letter', '/create')
    }
  }, [campaignId, occasionType])
  useTitle(campaign?.title
    ? `Create a ${campaign.title} link - Batify`
    : !campaignId && !occasionType
      ? 'Choose a celebration - Batify'
      : 'Write your letter - Batify')

  useEffect(() => {
    if (campaignId || occasionType) return undefined
    let dead = false
    sb.from('campaign_events').select(CAMPAIGN_COLUMNS).eq('is_enabled', true)
      .then(({ data, error: loadError }) => {
        if (dead) return
        if (loadError) {
          console.error('Could not load celebration types:', loadError)
          setOccasionError('Special celebrations could not be loaded. You can still create a birthday page.')
          setOccasionStatus('error')
          return
        }
        setOccasionOptions(data || [])
        setOccasionStatus('ready')
      })
      .catch((loadError) => {
        if (dead) return
        console.error('Could not load celebration types:', loadError)
        setOccasionError('Special celebrations could not be loaded. You can still create a birthday page.')
        setOccasionStatus('error')
      })
    return () => { dead = true }
  }, [campaignId, occasionType])

  useEffect(() => {
    if (!campaignId) {
      setCampaign(null)
      setCampaignStatus('idle')
      setCampaignError('')
      return
    }
    let dead = false
    setCampaignStatus('loading')
    sb.from('campaign_events').select(CAMPAIGN_COLUMNS).eq('id', campaignId).maybeSingle()
      .then(({ data, error: loadError }) => {
        if (dead) return
        if (loadError) {
          setCampaignError('Could not load this seasonal campaign. Please try again later.')
          setCampaignStatus('error')
        } else if (!data || !isCampaignActive(data)) {
          setCampaignError('This seasonal campaign is not currently accepting new pages.')
          setCampaignStatus('error')
        } else {
          setCampaign(data)
          setF((current) => ({
            ...current,
            birthdayDate: upcomingCampaignDate(data) || current.birthdayDate,
            christmasTreeColor: current.christmasTreeColor || CHRISTMAS_TREE_COLOR,
            christmasGiftBoxColor: current.christmasGiftBoxColor || CHRISTMAS_GIFT_BOX_COLOR,
          }))
          setCampaignStatus('ready')
        }
      })
    return () => { dead = true }
  }, [campaignId])

  useEffect(() => { saveDraft(f) }, [f])
  useEffect(() => { env.goTo(wiz === 1 ? 3 : 0) }, [wiz]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (wiz > 0) heading.current?.focus() }, [wiz])

  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErrs((p) => ({ ...p, [k]: '' })) }

  function validate(i) {
    const e = {}
    if (i === 0) {
      if (!f.ownerName.trim()) e.ownerName = 'Add your name so friends know whose letter this is.'
      if (!f.title.trim()) e.title = 'Give the page a title, like "Maria turns 25".'
      if (!f.birthdayDate) e.birthdayDate = `Pick your ${occasionOf(campaign?.id)?.dateLabel.toLowerCase() || 'birthday'}.`
      else if (campaign && !isValidCampaignEventDate(f.birthdayDate, campaign)) {
        e.birthdayDate = campaign.id === 'anniversary'
          ? 'Choose an anniversary date that has not passed.'
          : 'Choose an event date within the next 30 days or the configured event date.'
      }
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
    if (containsBlockedLanguage(f.ownerName) || containsBlockedLanguage(f.title) || containsBlockedLanguage(f.letter)) {
      setError(BLOCKED_LANGUAGE_MESSAGE)
      return
    }
    setBusy(true); setError('')
    try {
      const data = await postJSON('create-page', {
        turnstileToken: token, ownerName: f.ownerName.trim(), title: f.title.trim(), letter: f.letter.trim(),
        birthdayDate: f.birthdayDate, revealAt: fromLocalInput(f.revealAt), gcashNumber: f.gcashNumber.trim() || undefined, theme: f.theme,
        christmasTreeColor: campaign?.id === 'christmas' ? f.christmasTreeColor : undefined,
        christmasGiftBoxColor: campaign?.id === 'christmas' ? f.christmasGiftBoxColor : undefined,
        campaignType: campaign?.id,
      })
      rememberPage({ slug: data.slug, token: data.editToken, title: f.title.trim() })
      recordHistory('created', `Created “${f.title.trim()}”`, `/p/${data.slug}`)
      clearDraft()
      setResultForm({ ...f })
      setResult(data)
      setF({ ...EMPTY, ownerName: f.ownerName })
      success()
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(err.message); buzzError(); ts.current?.reset()
    } finally { setBusy(false) }
  }

  if (campaignStatus === 'loading' || (campaignId && !campaign)) {
    return <div className="page-wrap text-center" role="status">Loading seasonal campaign…</div>
  }
  if (campaignStatus === 'error') {
    return (
      <div className="page-wrap">
        <h1 className="text-4xl">Campaign unavailable</h1>
        <p role="alert" className="mt-3 text-flag">{campaignError}</p>
        <Link to="/" className="btn-primary mt-5">Back to Batify</Link>
      </div>
    )
  }
  if (result) {
    function createAnother() {
      setResult(null)
      setResultForm(null)
      setF({
        ...EMPTY,
        ownerName: resultForm?.ownerName || '',
        birthdayDate: campaign ? upcomingCampaignDate(campaign) || '' : '',
      })
      setWiz(0)
      setErrs({})
      setError('')
      setToken('')
      window.scrollTo({ top: 0 })
    }
    return <Result result={result} f={resultForm || f} campaign={occasionOf(campaign?.id)} onCreateAnother={createAnother} />
  }
  if (!campaignId && !occasionType) {
    const availableOccasions = occasionOptions.filter((event) =>
      event.id === 'anniversary' || (event.is_priority && isCampaignActive(event)),
    )
    return (
      <section className="page-wrap max-w-4xl" aria-labelledby="occasion-heading">
        <h1 id="occasion-heading" className="text-4xl sm:text-5xl">What are we celebrating?</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Pick the occasion and we’ll set up the right kind of letter.</p>
        {occasionStatus === 'loading' && <p className="mt-5" role="status">Loading celebrations…</p>}
        {occasionError && <p className="mt-5 text-sm font-semibold text-flag" role="status">{occasionError}</p>}
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <button type="button" className="card flex min-h-32 w-full flex-col items-start text-left transition-colors hover:bg-sun/30" onClick={() => navigate('/create?occasion=birthday')}>
            <span className="text-2xl font-display font-extrabold">Birthday</span>
            <span className="mt-2 text-muted">A personal letter and wishes for their big day.</span>
          </button>
          {availableOccasions.map((event) => (
            <button key={event.id} type="button" className="card flex min-h-32 w-full flex-col items-start text-left transition-colors hover:bg-sun/30" onClick={() => navigate(`/create?campaign=${encodeURIComponent(event.id)}`)}>
              <span className="text-2xl font-display font-extrabold">{event.title}</span>
              <span className="mt-2 text-muted">{event.description}</span>
            </button>
          ))}
        </div>
        <Link to="/" className="btn-ghost mt-7">Back to Batify</Link>
      </section>
    )
  }

  const first = f.ownerName.trim().split(/\s+/)[0]
  const occasion = occasionOf(campaign?.id)
  const wizardSteps = campaign?.id === 'christmas' ? CHRISTMAS_STEPS : STEPS
  const starters = occasion?.starters || STARTERS
  const eventTheme = occasion?.priorityTheme
  const titlePlaceholder = occasion?.id === 'christmas'
    ? `${first ? `${first}’s` : 'Your'} Christmas letter`
    : occasion?.titlePlaceholder || campaign?.title || (first ? `${first} turns 25` : 'Maria turns 25')
  const dateLabel = occasion?.dateLabel || 'Birthday'
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14 lg:py-12">
      <div>
        <Link to="/create" className="btn-ghost btn-sm mb-5"><Icon name="back" size={16} />Change celebration</Link>
        <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Progress">
          {wizardSteps.map((s, i) => (
            <li key={s} aria-current={i === wiz ? 'step' : undefined}>
              <div className={`h-2 rounded-full border-2 border-ink ${i < wiz ? 'bg-ink' : i === wiz ? 'bg-sun' : 'bg-white'}`} />
              <span className={`mt-1.5 hidden text-sm sm:block ${i === wiz ? 'font-bold' : 'text-muted'}`}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mb-1 text-sm font-bold text-muted sm:hidden">Step {wiz + 1} of 4</p>
        <h1 ref={heading} tabIndex={-1} className="text-4xl outline-none sm:text-5xl">
          {wiz === 3 && campaign?.id === 'christmas'
            ? 'Wrap your Christmas letter'
            : ['Who is this letter from?', 'Say what you want to say', 'Add a little surprise', 'Seal the envelope'][wiz]}
        </h1>
        {campaign && <p className="mt-2 font-semibold text-accent">{campaign.title} link · Share it with friends and family.</p>}

        <form onSubmit={submit} className="mt-7 space-y-6" noValidate>
          {wiz === 0 && (
            <>
              <Field id="ownerName" label="Your name" error={errs.ownerName}>
                <input id="ownerName" className="field" maxLength={60} value={f.ownerName} onChange={set('ownerName')} placeholder="Maria Santos" autoComplete="name" aria-invalid={!!errs.ownerName} aria-describedby={errs.ownerName ? 'ownerName-err' : undefined} />
              </Field>
              <Field id="title" label="Page title" error={errs.title} hint="This is the headline on the envelope.">
                <input id="title" className="field" maxLength={120} value={f.title} onChange={set('title')} placeholder={titlePlaceholder} aria-invalid={!!errs.title} aria-describedby={`title-${errs.title ? 'err' : 'hint'}`} />
              </Field>
              <Field id="birthdayDate" label={dateLabel} error={errs.birthdayDate}
                hint={campaign?.id === 'anniversary'
                    ? 'Your letter stays sealed until this date.'
                    : campaign?.is_priority
                      ? `This date is fixed for the ${campaign.title} event.`
                      : campaign ? 'Your letter stays sealed until this date. Choose a date within the next 30 days or the configured event date.' : undefined}>
                <input id="birthdayDate" type="date" className="field" value={f.birthdayDate} onChange={set('birthdayDate')} disabled={campaign?.is_priority === true} aria-invalid={!!errs.birthdayDate} aria-describedby={errs.birthdayDate ? 'birthdayDate-err' : undefined} />
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
                <p className="label">{occasion?.starterHeading || 'Stuck? Start with one of these:'}</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((s) => <button key={s} type="button" onClick={() => addStarter(s)} className="min-h-[44px] rounded-full border-2 border-ink bg-white px-4 text-sm font-bold hover:bg-sun">{s}...</button>)}
                </div>
              </div>
            </>
          )}

          {wiz === 2 && (
            <>
              {eventTheme ? (
                campaign?.id === 'christmas' ? (
                  <fieldset className="card space-y-4">
                    <legend className="label">Choose your Christmas colors</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex min-h-[72px] items-center gap-3 rounded-xl border-2 border-ink/15 bg-white p-3 font-semibold" htmlFor="christmas-tree-color">
                        <input
                          id="christmas-tree-color"
                          type="color"
                          className="h-12 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
                          value={f.christmasTreeColor}
                          onChange={(e) => setF((current) => ({ ...current, christmasTreeColor: e.target.value.toUpperCase() }))}
                        />
                        <span>Christmas tree</span>
                      </label>
                      <label className="flex min-h-[72px] items-center gap-3 rounded-xl border-2 border-ink/15 bg-white p-3 font-semibold" htmlFor="christmas-gift-box-color">
                        <input
                          id="christmas-gift-box-color"
                          type="color"
                          className="h-12 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
                          value={f.christmasGiftBoxColor}
                          onChange={(e) => setF((current) => ({ ...current, christmasGiftBoxColor: e.target.value.toUpperCase() }))}
                        />
                        <span>Gift box</span>
                      </label>
                    </div>
                    <p className="hint">These colors appear on your letter when friends open it.</p>
                  </fieldset>
                ) : (
                  <p className="card text-sm text-muted">The {occasion.label} illustration and seasonal colors are applied automatically.</p>
                )
              ) : (
                <fieldset>
                  <legend className="label">Envelope colors</legend>
                  <ThemePicker value={f.theme} onChange={(theme) => setF((p) => ({ ...p, theme }))} idPrefix="create-theme" />
                </fieldset>
              )}
              <Field id="revealAt" label={occasion?.revealLabel || 'Reveal wishes at'} optional hint={occasion?.revealHint || 'Wishes stay hidden behind a countdown until this time. Leave it empty to show them right away.'}>
                <input id="revealAt" type="datetime-local" className="field" value={f.revealAt} onChange={set('revealAt')} aria-describedby="revealAt-hint" />
                {f.birthdayDate && <button type="button" className="link mt-2 min-h-[44px] text-sm" onClick={() => setF((p) => ({ ...p, revealAt: `${p.birthdayDate}T00:00` }))}>{occasion?.revealButton || `Use midnight on my ${dateLabel.toLowerCase()}`}</button>}
              </Field>
              <Field id="gcash" label="GCash number" optional error={errs.gcashNumber} hint="Friends can send you a little extra. You confirm each payment yourself.">
                <input id="gcash" inputMode="tel" className="field" value={f.gcashNumber} onChange={set('gcashNumber')} placeholder="09171234567" maxLength={16} aria-invalid={!!errs.gcashNumber} aria-describedby={`gcash-${errs.gcashNumber ? 'err' : 'hint'}`} />
              </Field>
            </>
          )}

          {wiz === 3 && (
            <>
              <dl className="card divide-y-2 divide-ink/10 !p-0">
                {[['From', f.ownerName], ['Title', f.title], [dateLabel, f.birthdayDate], [occasion?.collectionLabel || 'Wishes', f.revealAt ? `Hidden until ${new Date(f.revealAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Visible right away'], ['GCash', f.gcashNumber || 'Off']].map(([k, v]) => (
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
              <button type="submit" className="btn-primary ml-auto" disabled={busy || !token}>
                {campaign?.id === 'christmas'
                  ? busy ? 'Wrapping…' : 'Wrap and create my page'
                  : busy ? 'Sealing...' : 'Seal and create my page'}
              </button>
            )}
          </div>
          <p className="text-sm text-muted">Your draft saves on this device as you type.</p>
        </form>
      </div>

      <aside aria-label="Envelope preview" className="lg:sticky lg:top-24 lg:self-start">
        <div data-theme={eventTheme || themeOf(f.theme)} style={eventTheme ? undefined : themeStyleOf(f.theme)} className="grid place-items-center overflow-hidden rounded-3xl border-2 border-ink bg-ground px-4 pb-14 pt-24">
          {eventTheme ? (
            <SeasonalOpener
              theme={eventTheme}
              title={f.title || titlePlaceholder}
              letterText={f.letter || 'Your letter appears here as you write it.'}
              step={env.step}
              onActivate={env.open}
              className="seasonal-opener--hero"
              treeColor={f.christmasTreeColor}
              giftBoxColor={f.christmasGiftBoxColor}
            />
          ) : (
            <Envelope3D step={env.step} initial={(f.ownerName.trim()[0] || 'B').toUpperCase()} size="min(70vw, 320px)" still={wiz === 1}>
              <div className="t">{f.title || 'Your title'}</div>
              {env.step >= 3 ? <p className="body" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.letter || 'Your letter appears here as you write it.'}</p> : <div className="s">With love, {f.ownerName || 'you'}</div>}
            </Envelope3D>
          )}
        </div>
        <p className="mt-3 text-center text-sm text-muted">This is how friends will see your envelope.</p>
      </aside>
    </div>
  )
}
