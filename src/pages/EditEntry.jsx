import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgetPage, loadMyPages } from '../lib/mypages'
import useTitle from '../lib/useTitle'

// Accepts a full edit URL or the bare 32-char token.
function extractToken(input) {
  const m = input.trim().match(/[a-z0-9]{32}/i)
  return m ? m[0].toLowerCase() : ''
}

export default function EditEntry() {
  useTitle('Open your page — Batify')
  const nav = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [mine, setMine] = useState(loadMyPages)

  function go(e) {
    e.preventDefault()
    const t = extractToken(value)
    if (!t) return setError("That doesn't look like an edit link. It ends with 32 letters and numbers.")
    nav(`/edit/${t}`)
  }

  return (
    <div className="page-wrap">
      <h1 className="text-3xl font-bold">Open your page</h1>
      <p className="mt-1 text-slate-600">Paste your private edit link (or just the code at the end of it).</p>

      <form onSubmit={go} className="card mt-6 space-y-3">
        <label className="label" htmlFor="tok">Edit link</label>
        <input id="tok" className="field" value={value} onChange={(e) => { setValue(e.target.value); setError('') }} placeholder="https://…/edit/abcd…" autoComplete="off" autoCapitalize="none" spellCheck="false" />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={!value.trim()}>Open dashboard</button>
      </form>

      {mine.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-bold">On this device</h2>
          <ul className="space-y-2">
            {mine.map((p) => (
              <li key={p.token} className="card flex items-center justify-between gap-3 !p-4">
                <Link to={`/edit/${p.token}`} className="min-w-0 flex-1 truncate font-semibold text-brand-600">{p.title || p.slug}</Link>
                <button className="text-xs text-slate-400 hover:text-red-600" onClick={() => { forgetPage(p.token); setMine(loadMyPages()) }}>Forget</button>
              </li>
            ))}
          </ul>
          <p className="hint">Saved only in this browser. Forgetting doesn't delete the page.</p>
        </section>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        Lost your link? Edit links can't be recovered. <Link to="/create" className="font-semibold text-brand-600">Create a new page</Link>
      </p>
    </div>
  )
}
