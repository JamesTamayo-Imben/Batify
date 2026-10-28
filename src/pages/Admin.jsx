// Super-admin console. Guarded by the ADMIN_SECRET function secret (no accounts).
// The secret is kept in sessionStorage only (cleared when the tab closes).
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { postJSON } from '../lib/ajax'
import { formatDateTime, peso } from '../lib/dates'
import { giftLabel } from '../lib/gifts'
import { copyText } from '../lib/share'
import CampaignSettings from '../components/CampaignEditor'

const SKEY = 'batify:admin'
const getSecret = () => { try { return sessionStorage.getItem(SKEY) || '' } catch { return '' } }

export default function Admin() {
  const [secret, setSecret] = useState(getSecret)
  const [input, setInput] = useState('')
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [rows, setRows] = useState({ pages: [], wishes: [], reports: [], contributions: [] })
  const [q, setQ] = useState('')
  const [pendingOnly, setPendingOnly] = useState(true)
  const [note, setNote] = useState('')

  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'; m.content = 'noindex'
    document.head.appendChild(m)
    return () => m.remove()
  }, [])

  const call = useCallback((action, payload = {}) => postJSON('admin', { adminSecret: secret, action, ...payload }), [secret])

  const logout = () => { try { sessionStorage.removeItem(SKEY) } catch { /* noop */ } setSecret(''); setStats(null) }

  const load = useCallback(async (which = tab) => {
    setBusy(true); setError('')
    try {
      if (which === 'overview') setStats((await call('stats')).stats)
      if (which === 'pages') await call('list-pages', { q }).then((d) => setRows((r) => ({ ...r, pages: d.pages })))
      if (which === 'wishes') await call('list-wishes', { pending: pendingOnly }).then((d) => setRows((r) => ({ ...r, wishes: d.wishes })))
      if (which === 'reports') await call('list-reports').then((d) => setRows((r) => ({ ...r, reports: d.reports })))
      if (which === 'payments') await call('list-contributions').then((d) => setRows((r) => ({ ...r, contributions: d.contributions })))
      if (which === 'campaigns') await call('list-campaigns').then((d) => setCampaigns(d.campaigns))
    } catch (e) {
      setError(e.message)
      if (/invalid admin secret/i.test(e.message)) logout()
    } finally { setBusy(false) }
  }, [call, tab, q, pendingOnly])

  useEffect(() => { if (secret) load(tab) }, [secret, tab, pendingOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action, payload, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusy(true); setError('')
    try { await call(action, payload); await load(tab) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  function login(e) {
    e.preventDefault()
    const s = input.trim()
    if (!s) return
    try { sessionStorage.setItem(SKEY, s) } catch { /* noop */ }
    setSecret(s); setInput('')
  }

  if (!secret) {
    return (
      <div className="page-wrap max-w-md">
        <h1 className="text-3xl font-bold">Admin</h1>
        <form onSubmit={login} className="card mt-5 space-y-3">
          <label className="label" htmlFor="sec">Admin secret</label>
          <input id="sec" type="password" className="field" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full">Enter</button>
        </form>
      </div>
    )
  }

  const tabs = [['overview', 'Overview'], ['pages', 'Pages'], ['wishes', 'Wishes'], ['reports', 'Reports'], ['payments', 'Payments'], ['campaigns', 'Campaigns']]
  const WishBody = ({ w }) => (
    <>
      <p className="font-bold">{w.sender_name} <span className="ml-1 text-sm font-normal text-muted">{giftLabel(w.gift_type)}</span></p>
      {w.message && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{w.message}</p>}
      {w.media_url && w.media_type === 'image' && <img src={w.media_url} alt="" loading="lazy" className="mt-2 max-h-40 rounded-lg" />}
      {w.media_url && w.media_type === 'video' && <video src={w.media_url} controls preload="metadata" className="mt-2 max-h-40 rounded-lg" />}
    </>
  )

  return (
    <div className="page-wrap max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin</h1>
        <button className="btn-ghost btn-sm" onClick={logout}>Log out</button>
      </div>

      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>{label}</button>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {note && <p role="status" className="mb-4 text-sm text-slate-500">{note}</p>}
      {busy && <p className="mb-3 text-xs text-slate-400">Working…</p>}

      {tab === 'overview' && stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[['Pages', stats.pages], ['Wishes', stats.wishes], ['Pending wishes', stats.pendingWishes], ['Contributions', stats.contributions], ['Pending payments', stats.pendingPay], ['Open reports', stats.reports]].map(([l, v]) => (
            <div key={l} className="card text-center"><div className="font-display text-3xl font-bold text-brand-500">{v}</div><div className="text-xs font-semibold text-slate-500">{l}</div></div>
          ))}
        </div>
      )}

      {tab === 'pages' && (
        <div className="space-y-3">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load('pages') }}>
            <input className="field" placeholder="Search name, title or slug" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-primary">Search</button>
          </form>
          {rows.pages.map((p) => (
            <div key={p.id} className="card !p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/p/${p.slug}`} className="font-bold text-brand-600">{p.title}</Link>
                  <p className="text-xs text-slate-500">{p.owner_name} · {p.slug} · {p.wishes?.[0]?.count ?? 0} wishes · {formatDateTime(p.created_at)}</p>
                </div>
                <span className={`badge ${p.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{p.is_published ? 'published' : 'hidden'}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost btn-sm" onClick={() => act('set-published', { pageId: p.id, value: !p.is_published })}>{p.is_published ? 'Unpublish' : 'Publish'}</button>
                <button className="btn-ghost btn-sm" onClick={async () => setNote((await copyText(`${location.origin}/edit/${p.edit_token}`)) ? 'Edit link copied (owner support only).' : 'Could not copy.')}>Copy edit link</button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => act('delete-page', { pageId: p.id }, `Permanently delete "${p.title}" and all its wishes?`)}>Delete</button>
              </div>
            </div>
          ))}
          {!busy && rows.pages.length === 0 && <p className="card text-center text-sm text-slate-500">No pages found.</p>}
        </div>
      )}

      {tab === 'wishes' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} /> Pending only</label>
          {rows.wishes.map((w) => (
            <div key={w.id} className="card !p-4">
              <WishBody w={w} />
              <p className="mt-2 text-xs text-slate-400">on {w.pages?.title} · {w.is_approved ? 'live' : 'pending'}</p>
              <div className="mt-3 flex gap-2">
                {!w.is_approved && <button className="btn-primary btn-sm" onClick={() => act('approve-wish', { wishId: w.id })}>Approve</button>}
                <button className="btn-ghost btn-sm text-red-600" onClick={() => act('delete-wish', { wishId: w.id }, 'Delete this wish?')}>Delete</button>
              </div>
            </div>
          ))}
          {!busy && rows.wishes.length === 0 && <p className="card text-center text-sm text-slate-500">Nothing here.</p>}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {rows.reports.map((r) => (
            <div key={r.id} className="card !p-4">
              <p className="mb-2 text-xs font-semibold text-amber-700">Reason: {r.reason} · {formatDateTime(r.created_at)}</p>
              {r.wishes ? <WishBody w={r.wishes} /> : <p className="text-sm text-slate-500">Wish already removed.</p>}
              <div className="mt-3 flex gap-2">
                <button className="btn-ghost btn-sm" onClick={() => act('dismiss-report', { reportId: r.id })}>Dismiss</button>
                {r.wishes && <button className="btn-ghost btn-sm text-red-600" onClick={() => act('delete-wish', { wishId: r.wishes.id }, 'Delete the reported wish?')}>Delete wish</button>}
              </div>
            </div>
          ))}
          {!busy && rows.reports.length === 0 && <p className="card text-center text-sm text-slate-500">No open reports</p>}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          {rows.contributions.map((c) => (
            <div key={c.id} className="card !p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold">{c.sender_name || 'Someone'} · {peso(c.amount)}</p><p className="text-xs text-slate-500">to {c.pages?.title} · {formatDateTime(c.created_at)}</p></div>
                <span className={`badge ${c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              </div>
              <div className="mt-3 flex gap-2">
                {c.proof_signed_url && <a className="btn-ghost btn-sm" href={c.proof_signed_url} target="_blank" rel="noreferrer noopener">Screenshot</a>}
                {c.status === 'pending' && <button className="btn-primary btn-sm" onClick={() => act('mark-paid', { contributionId: c.id })}>Mark paid</button>}
              </div>
            </div>
          ))}
          {!busy && rows.contributions.length === 0 && <p className="card text-center text-sm text-slate-500">No contributions.</p>}
        </div>
      )}

      {tab === 'campaigns' && (
        <CampaignSettings campaigns={campaigns} busy={busy}
          onSave={(payload) => act('update-campaign', payload)} />
      )}
    </div>
  )
}
