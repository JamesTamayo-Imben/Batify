import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Turnstile from '../components/Turnstile'
import { postJSON } from '../lib/ajax'
import { SLOTS } from '../lib/ads'
import { fromLocalInput } from '../lib/dates'
import { copyText, shareLink } from '../lib/share'
import { rememberPage } from '../lib/mypages'
import { error as buzzError, success } from '../lib/haptics'
import useTitle from '../lib/useTitle'

function LinkCard({ title, url, tone = 'default', warning, actions }) {
  const [copied, setCopied] = useState(false)
  const amber = tone === 'amber'
  async function copy() {
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }
  return (
    <div className={`card ${amber ? 'border-amber-300 bg-amber-50' : ''}`}>
      <h2 className="text-lg font-bold">{title}</h2>
      {warning && (
        <p role="note" className="mt-2 rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-900">
          ⚠️ {warning}
        </p>
      )}
      <input readOnly value={url} onFocus={(e) => e.target.select()} className="field mt-3" aria-label={title} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
        {actions}
      </div>
    </div>
  )
}

export default function Create() {
  useTitle('Create a birthday page — Batify')
  const [f, setF] = useState({
    ownerName: '', title: '', letter: '', birthdayDate: '', revealAt: '', gcashNumber: '',
  })
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [shareMsg, setShareMsg] = useState('')
  const ts = useRef(null)

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (busy || !token) return
    setBusy(true)
    setError('')
    try {
      const data = await postJSON('create-page', {
        turnstileToken: token,
        ownerName: f.ownerName.trim(),
        title: f.title.trim(),
        letter: f.letter.trim(),
        birthdayDate: f.birthdayDate,
        revealAt: fromLocalInput(f.revealAt),
        gcashNumber: f.gcashNumber.trim() || undefined,
      })
      rememberPage({ slug: data.slug, token: data.editToken, title: f.title.trim() })
      success()
      setResult(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
      buzzError()
      ts.current?.reset() // tokens are single-use: always reset so the user can retry
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const publicUrl = `${location.origin}/p/${result.slug}`
    const editUrl = `${location.origin}/edit/${result.editToken}`
    return (
      <div>
        <div className="page-wrap space-y-5">
          <div className="text-center">
            <div className="animate-pop text-5xl" aria-hidden="true">🎉</div>
            <h1 className="mt-2 text-3xl font-bold">Your page is live!</h1>
            <p className="mt-1 text-slate-600">Share the public link. Keep the edit link safe.</p>
          </div>

          <LinkCard
            title="Public link — share this"
            url={publicUrl}
            actions={
              <>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    const r = await shareLink({ title: f.title, text: `Send me a birthday wish 🎈`, url: publicUrl })
                    if (r === 'copied') setShareMsg('Link copied to clipboard.')
                  }}
                >
                  Share…
                </button>
                <Link to={`/p/${result.slug}`} className="btn-ghost">Open page</Link>
              </>
            }
          />
          {shareMsg && <p role="status" className="text-center text-sm text-slate-500">{shareMsg}</p>}

          <LinkCard
            tone="amber"
            title="Edit link — only for you"
            warning="Your only way to manage the page. No recovery."
            url={editUrl}
            actions={<Link to={`/edit/${result.editToken}`} className="btn-ghost">Open dashboard</Link>}
          />
          <p className="text-center text-xs text-slate-500">
            Tip: paste the edit link into your notes or message it to yourself now.
          </p>
        </div>
        <AdSlot slot={SLOTS.create} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-wrap">
        <h1 className="text-3xl font-bold">Create your birthday page</h1>
        <p className="mt-1 text-slate-600">One page, one link. No account needed.</p>

        <form onSubmit={submit} className="card mt-6 space-y-5" noValidate={false}>
          <div>
            <label className="label" htmlFor="ownerName">Your name</label>
            <input id="ownerName" className="field" required maxLength={60} value={f.ownerName} onChange={set('ownerName')} placeholder="Maria Santos" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="title">Page title</label>
            <input id="title" className="field" required maxLength={120} value={f.title} onChange={set('title')} placeholder="Maria turns 25!" />
          </div>
          <div>
            <label className="label" htmlFor="letter">Your letter</label>
            <textarea id="letter" className="field min-h-[180px] leading-relaxed" required maxLength={8000} value={f.letter} onChange={set('letter')} placeholder="Dear friends and family…" />
            <p className="hint text-right">{f.letter.length}/8000</p>
          </div>
          <div>
            <label className="label" htmlFor="birthdayDate">Birthday</label>
            <input id="birthdayDate" type="date" className="field" required value={f.birthdayDate} onChange={set('birthdayDate')} />
          </div>
          <div>
            <label className="label" htmlFor="revealAt">Reveal wishes at <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="revealAt" type="datetime-local" className="field" value={f.revealAt} onChange={set('revealAt')} />
            <p className="hint">
              Wishes stay hidden (with a countdown) until this time. Leave empty to show them right away.
            </p>
            {f.birthdayDate && (
              <button type="button" className="mt-2 text-xs font-semibold text-brand-600 underline" onClick={() => setF((p) => ({ ...p, revealAt: `${p.birthdayDate}T00:00` }))}>
                Use midnight on my birthday
              </button>
            )}
          </div>
          <div>
            <label className="label" htmlFor="gcash">GCash number <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="gcash" inputMode="tel" className="field" value={f.gcashNumber} onChange={set('gcashNumber')} placeholder="09171234567" maxLength={16} />
            <p className="hint">Lets friends send you a little extra. You confirm each payment yourself.</p>
          </div>

          <Turnstile ref={ts} onToken={setToken} onError={setError} />

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={busy || !token}>
            {busy ? 'Creating…' : 'Create my page 🎈'}
          </button>
        </form>
      </div>
      <AdSlot slot={SLOTS.create} />
    </div>
  )
}
