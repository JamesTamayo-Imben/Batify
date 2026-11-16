import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { clearHistory, readHistory } from '../lib/history'
import { formatDateTime } from '../lib/dates'
import useTitle from '../lib/useTitle'

const ACTIONS = {
  opened: 'Opened',
  writing: 'Writing',
  sent: 'Sent',
  created: 'Created',
}

export default function History() {
  const [entries, setEntries] = useState(readHistory)
  useTitle('Your history - Batify')

  function clear() {
    if (!entries.length || !window.confirm('Clear this device’s Batify history?')) return
    clearHistory()
    setEntries([])
  }

  return (
    <section className="page-wrap max-w-3xl" aria-labelledby="history-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-muted"><Icon name="clock" size={18} />On this device</div>
          <h1 id="history-heading" className="mt-1 text-4xl sm:text-5xl">Your Batify history</h1>
        </div>
        <button type="button" className="btn-ghost btn-sm" disabled={!entries.length} onClick={clear}>Clear history</button>
      </div>
      <p className="mt-3 max-w-2xl text-muted">A private, local list of letters you opened and things you created or sent. It stays in this browser and does not include letter contents or sync to other devices.</p>

      {entries.length ? (
        <ol className="mt-7 space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4">
              <div className="min-w-0">
                <span className="badge bg-sun/60 text-ink">{ACTIONS[entry.action] || 'Activity'}</span>
                <p className="mt-2 break-words font-semibold">{entry.label}</p>
                <time className="mt-1 block text-sm text-muted" dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
              </div>
              {entry.href && <Link className="btn-ghost btn-sm" to={entry.href}>Open</Link>}
            </li>
          ))}
        </ol>
      ) : (
        <div className="card mt-7 text-center">
          <h2 className="text-2xl">Nothing here yet</h2>
          <p className="mt-2 text-muted">Open a letter or start creating one and your recent activity will appear here.</p>
          <Link to="/create" className="btn-primary mt-4">Write a letter</Link>
        </div>
      )}
    </section>
  )
}
