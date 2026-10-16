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

  if (done) return <p className="text-xs text-slate-400">Reported. Thank you.</p>
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-slate-400 underline-offset-2 hover:underline">
        Report
      </button>
    )
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.set('mode', 'report')
      fd.set('wishId', wishId)
      fd.set('reason', reason)
      fd.set('turnstileToken', token)
      await postForm('send-wish', fd)
      setDone(true)
    } catch (e) {
      setError(e.message)
      ts.current?.reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-xl bg-slate-50 p-3">
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="field" aria-label="Reason">
        {REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <Turnstile ref={ts} onToken={setToken} onError={setError} />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary btn-sm" disabled={!token || busy} onClick={submit}>
          {busy ? 'Sending…' : 'Submit report'}
        </button>
        <button className="btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}
