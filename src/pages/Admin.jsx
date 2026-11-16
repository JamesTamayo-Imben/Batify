// Super-admin console. Login uses allowlisted Supabase Auth Google OAuth.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { postJSON } from '../lib/ajax'
import { adminAuth } from '../lib/supabase'
import { formatDateTime, peso } from '../lib/dates'
import { giftLabel } from '../lib/gifts'
import { copyText } from '../lib/share'
import { isPageExpired } from '../lib/pages'
import CampaignSettings from '../components/CampaignEditor'

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase()
const ADMIN_LOGIN_COOLDOWN_SECONDS = 30
const TABS = [['overview', 'Overview'], ['pages', 'Pages'], ['wishes', 'Wishes'], ['reports', 'Reports'], ['payments', 'Payments'], ['campaigns', 'Campaigns']]
const SUCCESS_MESSAGES = {
  'set-published': 'Page visibility updated.',
  'delete-page': 'Page and its wishes deleted.',
  'approve-wish': 'Wish approved. It leaves the Pending only list; uncheck that filter to find it. Public display requires the page to be published, open, and revealed.',
  'delete-wish': 'Wish deleted.',
  'dismiss-report': 'Report dismissed.',
  'mark-paid': 'Contribution marked as paid.',
  'update-campaign': 'Campaign settings saved.',
}

function campaignActionError(action, message) {
  if (
    (action === 'list-campaigns' || action === 'update-campaign')
    && /^unknown action\.?$/i.test(message)
  ) {
    return 'The deployed admin function does not support campaign settings yet. Deploy the latest admin Edge Function, then try again.'
  }
  return message
}

function DeviceInfo({ value }) {
  const info = value && typeof value === 'object' ? value : {}
  const detail = [info.device, info.browser, info.os]
    .map((item) => typeof item === 'string' && item ? item : 'Unknown')
    .join(' · ')
  return <p className="mt-1 text-xs text-muted">Device: {detail}</p>
}

function wishApprovalStatus(wish) {
  if (!wish.is_approved) return 'Pending'
  const page = wish.pages
  if (!page?.is_published) return 'Approved · page unpublished'
  if (page.opens_at && Date.parse(page.opens_at) > Date.now()) {
    return `Approved · page opens ${formatDateTime(page.opens_at)}`
  }
  if (page.expires_at && Date.parse(page.expires_at) <= Date.now()) return 'Approved · page expired'
  if (page.reveal_at && Date.parse(page.reveal_at) > Date.now()) {
    return `Approved · reveals ${formatDateTime(page.reveal_at)}`
  }
  return 'Approved · visible'
}

export default function Admin() {
  const [sessionToken, setSessionToken] = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)
  const [loginCooldown, setLoginCooldown] = useState(0)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [rows, setRows] = useState({ pages: [], wishes: [], reports: [], contributions: [] })
  const [q, setQ] = useState('')
  const [pendingOnly, setPendingOnly] = useState(true)
  const [pendingPaymentsOnly, setPendingPaymentsOnly] = useState(true)
  const [note, setNote] = useState('')
  const loadVersion = useRef(0)
  const activeTab = useRef(tab)
  const signInStarted = useRef(false)

  useEffect(() => {
    if (loginCooldown <= 0) return undefined
    const timer = window.setTimeout(() => {
      setLoginCooldown((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [loginCooldown])

  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'; m.content = 'noindex'
    document.head.appendChild(m)
    return () => m.remove()
  }, [])

  useEffect(() => {
    let active = true
    const acceptSession = (session) => {
      if (!session) {
        setSessionToken('')
        return
      }
      const email = session.user?.email?.trim().toLowerCase()
      if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
        setSessionToken('')
        setError(`That Google account is not authorized for Batify admin. Sign in with the configured admin account${ADMIN_EMAIL ? ` (${ADMIN_EMAIL})` : ''}.`)
        return
      }
      setError('')
      setSessionToken(session.access_token)
    }
    const { data: { subscription } } = adminAuth.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      acceptSession(session)
    })
    adminAuth.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(`Could not restore the admin sign-in: ${sessionError.message}`)
      acceptSession(data?.session)
      setAuthReady(true)
    }).catch((sessionError) => {
      if (!active) return
      setError(`Could not restore the admin sign-in: ${sessionError.message}`)
      setAuthReady(true)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const call = useCallback((action, payload = {}) => postJSON('admin', { action, ...payload }, sessionToken), [sessionToken])

  const logout = useCallback(async () => {
    loadVersion.current += 1
    setSessionToken('')
    setStats(null)
    setBusy(false)
    try {
      const { error: signOutError } = await adminAuth.auth.signOut({ scope: 'local' })
      if (signOutError) throw signOutError
    } catch (signOutError) {
      setError(`Signed out in this view, but could not clear the Supabase session: ${signOutError.message}`)
    }
  }, [])

  const load = useCallback(async (which = tab) => {
    const requestVersion = ++loadVersion.current
    setBusy(true); setError('')
    if (which === 'overview') setStats(null)
    try {
      let data
      if (which === 'overview') data = await call('stats')
      if (which === 'pages') data = await call('list-pages', { q })
      if (which === 'wishes') data = await call('list-wishes', { pending: pendingOnly })
      if (which === 'reports') data = await call('list-reports')
      if (which === 'payments') data = await call('list-contributions', { pending: pendingPaymentsOnly })
      if (which === 'campaigns') data = await call('list-campaigns')
      if (requestVersion !== loadVersion.current) return
      if (which === 'overview') setStats(data.stats)
      if (which === 'pages') setRows((r) => ({ ...r, pages: data.pages }))
      if (which === 'wishes') setRows((r) => ({ ...r, wishes: data.wishes }))
      if (which === 'reports') setRows((r) => ({ ...r, reports: data.reports }))
      if (which === 'payments') setRows((r) => ({ ...r, contributions: data.contributions }))
      if (which === 'campaigns') setCampaigns(data.campaigns)
    } catch (e) {
      if (requestVersion !== loadVersion.current) return
      setError(which === 'campaigns' ? campaignActionError('list-campaigns', e.message) : e.message)
      if (/admin session expired/i.test(e.message)) logout()
    } finally {
      if (requestVersion === loadVersion.current) setBusy(false)
    }
  }, [call, logout, pendingOnly, pendingPaymentsOnly, q, tab])

  useEffect(() => { activeTab.current = tab }, [tab])
  useEffect(() => { if (sessionToken) load(tab) }, [sessionToken, tab, pendingOnly, pendingPaymentsOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action, payload, confirmMsg) {
    if (busy || (confirmMsg && !confirm(confirmMsg))) return
    const requestVersion = loadVersion.current
    setBusy(true); setError('')
    setNote('')
    try {
      await call(action, payload)
      setNote(SUCCESS_MESSAGES[action] || 'Changes saved.')
      await load(activeTab.current)
    } catch (e) {
      setError(campaignActionError(action, e.message))
    } finally {
      if (requestVersion === loadVersion.current) setBusy(false)
    }
  }

  async function securePendingMedia() {
    if (busy) return
    setBusy(true); setError(''); setNote('')
    try {
      const result = await call('secure-pending-media')
      setNote(`${result.migrated} older pending upload${result.migrated === 1 ? '' : 's'} secured.${result.failed ? ` ${result.failed} need attention; check server logs.` : ''}${result.hasMore ? ' Run this again to process the next batch.' : ''}`)
      await load('wishes')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    if (busy || loginCooldown > 0 || signInStarted.current) return
    if (!ADMIN_EMAIL) {
      setError('Set VITE_ADMIN_EMAIL to the same address as the Supabase ADMIN_EMAIL secret, then restart or rebuild the app.')
      return
    }
    signInStarted.current = true
    setBusy(true); setError(''); setNote('')
    try {
      const { error: signInError } = await adminAuth.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (signInError) throw signInError
      setLoginCooldown(ADMIN_LOGIN_COOLDOWN_SECONDS)
      signInStarted.current = false
    } catch (e) {
      signInStarted.current = false
      setError(`Could not start Google sign-in: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  function selectTab(nextTab) {
    activeTab.current = nextTab
    setNote('')
    setTab(nextTab)
  }

  function moveTab(event, index) {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!direction) return
    event.preventDefault()
    const nextIndex = (index + direction + TABS.length) % TABS.length
    const nextTab = TABS[nextIndex][0]
    selectTab(nextTab)
    document.getElementById(`admin-tab-${nextTab}`)?.focus()
  }

  if (!authReady) {
    return <p role="status" className="page-wrap text-center text-muted">Checking admin sign-in…</p>
  }

  if (!sessionToken) {
    return (
      <div className="page-wrap max-w-md">
        <h1 className="text-3xl font-bold">Admin console</h1>
        <p className="mt-2 text-muted">Sign in with the authorized Google account to manage Batify pages and activity.</p>
        <div className="card mt-5 space-y-3">
          <p className="text-sm text-muted">
            Continue with <span className="font-semibold">{ADMIN_EMAIL || 'the configured admin Google account'}</span>.
          </p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {note && <p role="status" className="text-sm text-emerald-700">{note}</p>}
          {loginCooldown > 0 && <p role="status" className="text-sm text-muted">To prevent repeated sign-in requests, wait {loginCooldown} seconds before trying again.</p>}
          <button type="button" className="btn-primary w-full" disabled={busy || loginCooldown > 0} onClick={signInWithGoogle}>
            {busy ? 'Opening Google…' : loginCooldown > 0 ? `Please wait (${loginCooldown}s)` : 'Continue with Google'}
          </button>
        </div>
      </div>
    )
  }

  const currentTab = TABS.find(([id]) => id === tab)?.[1] || 'Overview'
  const WishBody = ({ w }) => (
    <>
      <p className="font-bold">{w.sender_name} <span className="ml-1 text-sm font-normal text-muted">{giftLabel(w.gift_type)}</span></p>
      {w.message && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{w.message}</p>}
      {w.media_url && w.media_type === 'image' && <img src={w.media_url} alt="" loading="lazy" className="mt-2 max-h-40 rounded-lg" />}
      {w.media_url && w.media_type === 'video' && <video src={w.media_url} controls preload="metadata" className="mt-2 max-h-40 rounded-lg" />}
    </>
  )

  const metrics = stats && [
    { label: 'Pages', value: stats.pages, tab: 'pages', hint: 'Manage published pages' },
    { label: 'Wishes', value: stats.wishes, tab: 'wishes', filter: 'all', hint: 'Review all wishes' },
    { label: 'Pending wishes', value: stats.pendingWishes, tab: 'wishes', filter: 'pending', hint: 'Review the queue' },
    { label: 'Contributions', value: stats.contributions, tab: 'payments', filter: 'all', hint: 'Review all contributions' },
    { label: 'Pending payments', value: stats.pendingPay, tab: 'payments', filter: 'pending', hint: 'Review pending payments' },
    { label: 'Open reports', value: stats.reports, tab: 'reports', hint: 'Review reported wishes' },
  ]

  function openMetric(metric) {
    if (metric.tab === 'wishes') setPendingOnly(metric.filter === 'pending')
    if (metric.tab === 'payments') setPendingPaymentsOnly(metric.filter === 'pending')
    selectTab(metric.tab)
  }

  return (
    <div className="page-wrap max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin console</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Manage pages, review wishes and reports, verify contributions, and update seasonal campaigns.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => load(tab)}>Refresh {currentTab.toLowerCase()}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => { setError(''); setNote(''); logout() }}>Log out</button>
        </div>
      </div>

      <div role="tablist" aria-label="Admin sections" className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map(([id, label], index) => (
          <button key={id} id={`admin-tab-${id}`} type="button" role="tab" aria-selected={tab === id}
            aria-controls="admin-panel" tabIndex={tab === id ? 0 : -1}
            onClick={() => selectTab(id)} onKeyDown={(event) => moveTab(event, index)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-ink'}`}>{label}</button>
        ))}
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {note && <p role="status" className="mb-3 text-sm font-semibold text-emerald-700">{note}</p>}
      {busy && <p role="status" aria-live="polite" className="mb-3 text-sm text-muted">{tab === 'campaigns' ? 'Saving or loading campaign settings…' : `Loading ${currentTab.toLowerCase()}…`}</p>}

      <section id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`} aria-busy={busy} tabIndex={0} className="min-w-0">
        <h2 className="sr-only">{currentTab}</h2>
        {tab === 'overview' && stats && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <button key={metric.label} type="button" className="card text-left transition-colors hover:bg-accent-soft focus-visible:outline-accent"
                  onClick={() => openMetric(metric)} aria-label={`${metric.label}: ${metric.value}. ${metric.hint}.`}>
                  <span className="block text-3xl font-bold tabular-nums text-accent">{metric.value}</span>
                  <span className="mt-1 block font-bold">{metric.label}</span>
                  <span className="mt-2 block text-sm text-muted">{metric.hint}</span>
                </button>
              ))}
            </div>
            <section aria-labelledby="rate-limit-heading" className="card mt-4">
              <h3 id="rate-limit-heading" className="text-xl font-bold">Abuse-prevention limits</h3>
              <p className="mt-1 text-sm text-muted">Current server-side limits, shared across requests when the database limiter is available.</p>
              <ul className="mt-3 divide-y divide-slate-200">
                {(stats.rateLimits || []).map((limit) => (
                  <li key={limit.action} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-sm">
                    <span className="font-semibold">{limit.action}</span>
                    <span className="text-muted">{limit.limit} / {limit.window}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {tab === 'overview' && !stats && !busy && !error && <p className="card text-sm text-muted">The overview is not available yet. Refresh to try again.</p>}

        {tab === 'pages' && (
          <div className="space-y-3">
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); load('pages') }}>
              <input aria-label="Search pages by name, title or slug" className="field min-w-0 flex-1" placeholder="Search name, title or slug" value={q} onChange={(e) => setQ(e.target.value)} />
              <button type="submit" className="btn-primary sm:w-auto" disabled={busy}>Search pages</button>
            </form>
            {rows.pages.map((p) => {
              const expired = isPageExpired(p.expires_at)
              return (
                <article key={p.id} className="card !p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/p/${p.slug}`} className="break-words font-bold text-brand-600">{p.title}</Link>
                      <p className="mt-1 break-words text-sm text-muted">{p.owner_name} · {p.slug}</p>
                      <p className="mt-1 text-xs text-muted">{p.wishes?.[0]?.count ?? 0} wishes · created {formatDateTime(p.created_at)} · expires {formatDateTime(p.expires_at)}</p>
                      <DeviceInfo value={p.device_info} />
                    </div>
                    <span className={`badge ${expired ? 'bg-amber-100 text-amber-700' : p.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{expired ? 'expired' : p.is_published ? 'published' : 'hidden'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost btn-sm" disabled={busy || (expired && !p.is_published)} onClick={() => act('set-published', { pageId: p.id, value: !p.is_published })}>{p.is_published ? 'Unpublish' : 'Publish'}</button>
                    <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={async () => setNote((await copyText(`${location.origin}/edit/${p.edit_token}`)) ? 'Edit link copied (owner support only).' : 'Could not copy the edit link. Try again.')}>Copy edit link</button>
                    <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => act('delete-page', { pageId: p.id }, `Permanently delete "${p.title}" and all its wishes?`)}>Delete page</button>
                  </div>
                </article>
              )
            })}
            {!busy && !error && rows.pages.length === 0 && <p className="card text-sm text-muted">{q ? 'No pages match that search. Try another name, title, or slug.' : 'No pages to manage yet.'}</p>}
          </div>
        )}

        {tab === 'wishes' && (
          <div className="space-y-3">
            <div className="card flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">Secure older pending uploads left in the public bucket before this update. Processes up to 20 at a time.</p>
              <button type="button" className="btn-ghost btn-sm shrink-0" disabled={busy} onClick={securePendingMedia}>
                Secure older uploads
              </button>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold" htmlFor="pending-only">
              <input id="pending-only" type="checkbox" checked={pendingOnly} disabled={busy} onChange={(e) => setPendingOnly(e.target.checked)} />
              Pending only
            </label>
            {rows.wishes.map((w) => (
              <article key={w.id} className="card !p-4">
                <WishBody w={w} />
                <p className="mt-2 text-xs text-muted">
                  On {w.pages?.title} · {wishApprovalStatus(w)}
                </p>
                <DeviceInfo value={w.device_info} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {!w.is_approved && <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => act('approve-wish', { wishId: w.id })}>Approve wish</button>}
                  <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => act('delete-wish', { wishId: w.id }, 'Delete this wish?')}>Delete wish</button>
                </div>
              </article>
            ))}
            {!busy && !error && rows.wishes.length === 0 && <p className="card text-sm text-muted">{pendingOnly ? 'No wishes are waiting for approval.' : 'No wishes found.'}</p>}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-3">
            {rows.reports.map((r) => (
              <article key={r.id} className="card !p-4">
                <p className="mb-2 text-sm font-semibold text-amber-700">Reported for {r.reason} · {formatDateTime(r.created_at)}</p>
                <DeviceInfo value={r.device_info} />
                {r.wishes ? <WishBody w={r.wishes} /> : <p className="text-sm text-muted">The reported wish has already been removed.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => act('dismiss-report', { reportId: r.id })}>Dismiss report</button>
                  {r.wishes && <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => act('delete-wish', { wishId: r.wishes.id }, 'Delete the reported wish?')}>Delete wish</button>}
                </div>
              </article>
            ))}
            {!busy && !error && rows.reports.length === 0 && <p className="card text-sm text-muted">No open reports. You’re all caught up.</p>}
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold" htmlFor="pending-payments-only">
                <input id="pending-payments-only" type="checkbox" checked={pendingPaymentsOnly} disabled={busy} onChange={(e) => setPendingPaymentsOnly(e.target.checked)} />
                Pending only
              </label>
              <p className="text-xs text-muted">Showing the latest 100 contributions{pendingPaymentsOnly ? ' awaiting review' : ''}.</p>
            </div>
            {rows.contributions.map((c) => (
              <article key={c.id} className="card !p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{c.sender_name || 'Someone'} · {peso(c.amount)}</p>
                    <p className="mt-1 break-words text-sm text-muted">To {c.pages?.title} · {formatDateTime(c.created_at)}</p>
                    <DeviceInfo value={c.device_info} />
                  </div>
                  <span className={`badge ${c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.proof_signed_url && <a className="btn-ghost btn-sm" href={c.proof_signed_url} target="_blank" rel="noreferrer noopener">View payment proof</a>}
                  {c.status === 'pending' && <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={() => act('mark-paid', { contributionId: c.id })}>Mark paid</button>}
                </div>
              </article>
            ))}
            {!busy && !error && rows.contributions.length === 0 && <p className="card text-sm text-muted">{pendingPaymentsOnly ? 'No contributions are waiting for review.' : 'No contributions found.'}</p>}
          </div>
        )}

        {tab === 'campaigns' && (
          <CampaignSettings campaigns={campaigns} busy={busy} error={error} onSave={(payload) => act('update-campaign', payload)} />
        )}
      </section>
    </div>
  )
}
