import { useRef, useState } from 'react'
import Turnstile from './Turnstile'
import { postForm } from '../lib/ajax'

const REASONS = ['Inappropriate', 'Spam', 'Harassment', 'Other']

export default function ReportWish({ wishId }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const ts = useRef(null)

  if (done) return <p className="text-sm text-muted">Reported. Thank you.</p>
  if (!open) return <button onClick={() => setOpen(true)} className="min-h-[44px] px-1 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">Report this wish</button>

  async function submit() {
    setBusy(true); setError('')
    try {
      const fd = new FormData()
      fd.set('mode', 'report'); fd.set('wishId', wishId); fd.set('reason', reason); fd.set('turnstileToken', token)
      await postForm('send-wish', fd)
      setDone(true)
    } catch (e) { setError(e.message); ts.current?.reset() } finally { setBusy(false) }
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-xl border-2 border-ink/20 bg-slate-50 p-3">
      <label className="label" htmlFor={`r-${wishId}`}>Reason</label>
      <select id={`r-${wishId}`} value={reason} onChange={(e) => setReason(e.target.value)} className="field">
        {REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <Turnstile ref={ts} onToken={setToken} onError={setError} />
      {error && <p role="alert" className="text-sm font-semibold text-flag">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary btn-sm" disabled={!token || busy} onClick={submit}>{busy ? 'Sending' : 'Send report'}</button>
        <button className="btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}
