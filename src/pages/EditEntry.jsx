import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgetPage, loadMyPages } from '../lib/mypages'
import useTitle from '../lib/useTitle'
import Icon from '../components/Icon'

function extractToken(input) {
  const m = input.trim().match(/[a-z0-9]{32}/i)
  return m ? m[0].toLowerCase() : ''
}

export default function EditEntry() {
  useTitle('Open your page - Batify')
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
      <h1 className="text-4xl sm:text-5xl">Open your page</h1>
      <p className="mt-3 max-w-lg text-lg text-muted">Paste your private edit link, or just the code at the end of it.</p>

      <form onSubmit={go} className="card mt-7 space-y-3">
        <label className="label" htmlFor="tok">Edit link</label>
        <input id="tok" className="field" value={value} aria-invalid={!!error} aria-describedby={error ? 'tok-err' : undefined}
          onChange={(e) => { setValue(e.target.value); setError('') }} placeholder="https://batify.app/edit/abcd..." autoComplete="off" autoCapitalize="none" spellCheck="false" />
        {error && <p id="tok-err" role="alert" className="text-sm font-semibold text-flag">{error}</p>}
        <button className="btn-primary w-full sm:w-auto" disabled={!value.trim()}>Open dashboard</button>
      </form>

      {mine.length > 0 && (
        <section className="mt-10" aria-labelledby="mine-h">
          <h2 id="mine-h" className="mb-3 text-2xl">On this device</h2>
          <ul className="space-y-2">
            {mine.map((p) => (
              <li key={p.token} className="card flex items-center justify-between gap-3 !p-2 pl-4">
                <Link to={`/edit/${p.token}`} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 truncate font-bold text-accent"><Icon name="mail" size={18} />{p.title || p.slug}</Link>
                <button className="min-h-[44px] px-3 text-sm font-semibold text-muted hover:text-flag" onClick={() => { forgetPage(p.token); setMine(loadMyPages()) }}>Forget</button>
              </li>
            ))}
          </ul>
          <p className="hint">Saved only in this browser. Forgetting does not delete the page.</p>
        </section>
      )}

      <p className="mt-10 text-muted">Lost your link? Edit links cannot be recovered. <Link to="/create" className="link">Write a new letter</Link></p>
    </div>
  )
}
