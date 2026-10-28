// Owner dashboard. NO ADS here (by design). All actions go through manage-page.
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import { postForm, postJSON } from '../lib/ajax'
import { formatDate, formatDateTime, fromLocalInput, peso, toLocalInput } from '../lib/dates'
import { validateImage } from '../lib/files'
import { giftLabel } from '../lib/gifts'
import GiftArt from '../components/art/GiftArt'
import Icon from '../components/Icon'
import { qrPng, qrSvg } from '../lib/qr'
import { copyText, shareLink } from '../lib/share'
import { rememberPage } from '../lib/mypages'
import { CAMPAIGN_COLUMNS, giftOptionsFor, occasionOf } from '../lib/campaigns'
import { sb } from '../lib/supabase'
import { THEMES } from '../lib/themes'
import useTitle from '../lib/useTitle'

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  )
}

function WishRow({ wish, pending, busy, onApprove, onDelete, giftOptions }) {
  return (
    <li className="card !p-4">
      <div className="flex items-start gap-3">
        <GiftArt id={wish.gift_type} className="h-12 w-12 shrink-0" label={giftOptions?.[wish.gift_type] || giftLabel(wish.gift_type)} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{wish.sender_name} <span className="ml-1 text-xs font-normal text-slate-400">{formatDateTime(wish.created_at)}</span></p>
          {wish.message && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{wish.message}</p>}
          {wish.media_url && wish.media_type === 'image' && <img src={wish.media_url} alt="" loading="lazy" className="mt-2 max-h-56 rounded-xl" />}
          {wish.media_url && wish.media_type === 'video' && <video src={wish.media_url} controls playsInline preload="metadata" className="mt-2 max-h-56 rounded-xl bg-black" />}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {pending && <button className="btn-primary btn-sm" disabled={busy} onClick={onApprove}>Approve</button>}
        <button className="btn-ghost btn-sm text-red-600" disabled={busy} onClick={onDelete}>{pending ? 'Delete' : 'Remove'}</button>
      </div>
    </li>
  )
}

function ShareKit({ url, slug }) {
  const [svg, setSvg] = useState('')
  const [shown, setShown] = useState(false)
  useEffect(() => { if (shown && !svg) qrSvg(url, { size: 180 }).then(setSvg).catch(() => {}) }, [shown, svg, url])
  async function dl() { const a = document.createElement('a'); a.href = await qrPng(url); a.download = `batify-${slug}.png`; a.click() }
  return (
    <details className="mt-3 rounded-2xl border-2 border-ink bg-white" onToggle={(e) => setShown(e.currentTarget.open)}>
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4 font-bold"><Icon name="qr" size={18} />QR code for cards and cake toppers</summary>
      <div className="flex flex-col items-center gap-4 px-4 pb-4 sm:flex-row">
        <div className="h-[180px] w-[180px] overflow-hidden rounded-xl border-2 border-ink" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label="QR code for your public link" />
        <button className="btn-ghost btn-sm" onClick={dl}><Icon name="download" size={16} />Download PNG</button>
      </div>
    </details>
  )
}

export default function EditPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('wishes')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null) // {type, text}
  const [campaign, setCampaign] = useState(null)
  const [campaignError, setCampaignError] = useState('')

  useTitle(data ? `Manage — ${data.page.title}` : 'Manage — Batify')

  const flash = useCallback((text, type = 'ok') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const call = useCallback((action, payload = {}) => postJSON('manage-page', { editToken: token, action, ...payload }), [token])

  const load = useCallback(async () => {
    try {
      const d = await call('get')
      setData(d)
      setStatus('ready')
      rememberPage({ slug: d.page.slug, token, title: d.page.title })
    } catch (e) {
      setLoadError(e.message)
      setStatus('error')
    }
  }, [call, token])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const campaignType = data?.page.campaign_type
    if (!campaignType) {
      setCampaign(null)
      setCampaignError('')
      return
    }
    let dead = false
    sb.from('campaign_events').select(CAMPAIGN_COLUMNS).eq('id', campaignType).maybeSingle()
      .then(({ data: event, error }) => {
        if (dead) return
        if (error) setCampaignError('Custom campaign gift labels could not be loaded.')
        else setCampaign(event)
      })
    return () => { dead = true }
  }, [data?.page.campaign_type])

  // Run a mutation with busy state + error surfacing
  async function run(fn, okMsg) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      if (okMsg) flash(okMsg)
    } catch (e) {
      flash(e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return <div className="page-wrap text-center text-slate-500">Loading your dashboard</div>
  if (status === 'error') {
    return (
      <div className="page-wrap text-center">
        <Icon name="key" size={44} className="mx-auto" />
        <h1 className="mt-3 text-3xl">We couldn't open that</h1>
        <p className="mt-1 text-slate-600">{loadError}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button className="btn-ghost" onClick={() => { setStatus('loading'); load() }}>Try again</button>
          <Link to="/edit" className="btn-primary">Use another link</Link>
        </div>
      </div>
    )
  }

  const { page, wishes, contributions } = data
  const pending = wishes.filter((w) => !w.is_approved)
  const live = wishes.filter((w) => w.is_approved)
  const pendingPay = contributions.filter((c) => c.status === 'pending')
  const publicUrl = `${location.origin}/p/${page.slug}`
  const occasion = occasionOf(page.campaign_type)
  const giftOptions = page.campaign_type ? giftOptionsFor(campaign || { id: page.campaign_type }) : null

  const patchWish = (id, fn) => setData((d) => ({ ...d, wishes: fn(d.wishes, id) }))

  const tabs = [
    ['wishes', `Wishes${pending.length ? ` (${pending.length})` : ''}`],
    ['gcash', `GCash${pendingPay.length ? ` (${pendingPay.length})` : ''}`],
    ['settings', 'Settings'],
  ]

  return (
    <div className="page-wrap">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-sm font-bold text-muted"><LogoMark size={22} />Dashboard</div>
        <h1 className="mt-1 text-4xl sm:text-5xl">{page.title}</h1>
        <p className="mt-2 text-muted">
          {occasion ? `${occasion.label}: ${formatDate(page.birthday_date)}` : formatDate(page.birthday_date)}. {page.is_published ? 'Published' : 'Unpublished'}.
          {page.reveal_at && ` Wishes reveal ${formatDateTime(page.reveal_at)}.`}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Opened', typeof page.open_count === 'number' ? page.open_count : null, 'eye'],
            ['Live wishes', live.length, 'heart'],
            ['To review', pending.length, 'clock'],
            ['GCash confirmed', peso(contributions.filter((c) => c.status === 'paid').reduce((a, c) => a + Number(c.amount), 0)), 'wallet'],
          ].filter(([, v]) => v !== null).map(([k, v, ic]) => (
            <div key={k} className={`rounded-2xl border-2 border-ink p-3 ${k === 'To review' && pending.length ? 'bg-sun' : 'bg-white'}`}>
              <dt className="flex items-center gap-1.5 text-sm font-bold text-muted"><Icon name={ic} size={16} />{k}</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/p/${page.slug}`} className="btn-ghost btn-sm"><Icon name="eye" size={16} />View page</Link>
          <button className="btn-ghost btn-sm" onClick={async () => flash((await copyText(publicUrl)) ? 'Public link copied' : 'Could not copy', 'ok')}><Icon name="copy" size={16} />Copy link</button>
          <button className="btn-ghost btn-sm" onClick={() => shareLink({ title: page.title, text: occasion?.shareText || 'Send me a birthday wish', url: publicUrl })}><Icon name="share" size={16} />Share</button>
        </div>
        {campaignError && <p role="status" className="mt-2 text-sm text-flag">{campaignError}</p>}
        <ShareKit url={publicUrl} slug={page.slug} />
      </header>

      {toast && (
        <div role="status" className={`fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.type === 'err' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.text}
        </div>
      )}

      <div role="tablist" className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${tab === id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'wishes' && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-bold">Pending <span className="text-slate-400">({pending.length})</span></h2>
            {pending.length === 0 ? <p className="card text-center text-sm text-slate-500">Nothing waiting for approval.</p> : (
              <ul className="space-y-3">
                {pending.map((w) => (
                  <WishRow key={w.id} wish={w} pending busy={busy}
                    giftOptions={giftOptions}
                    onApprove={() => run(async () => { await call('approve-wish', { wishId: w.id }); patchWish(w.id, (ws, id) => ws.map((x) => x.id === id ? { ...x, is_approved: true } : x)) }, 'Wish approved')}
                    onDelete={() => confirm('Delete this wish?') && run(async () => { await call('delete-wish', { wishId: w.id }); patchWish(w.id, (ws, id) => ws.filter((x) => x.id !== id)) }, 'Wish deleted')} />
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold">Live <span className="text-slate-400">({live.length})</span></h2>
            {live.length === 0 ? <p className="card text-center text-sm text-slate-500">No live wishes yet.</p> : (
              <ul className="space-y-3">
                {live.map((w) => (
                  <WishRow key={w.id} wish={w} busy={busy}
                    giftOptions={giftOptions}
                    onDelete={() => confirm('Remove this wish from your page?') && run(async () => { await call('delete-wish', { wishId: w.id }); patchWish(w.id, (ws, id) => ws.filter((x) => x.id !== id)) }, 'Wish removed')} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'gcash' && <GcashTab data={data} setData={setData} run={run} call={call} busy={busy} />}
      {tab === 'settings' && <SettingsTab page={page} setData={setData} run={run} call={call} busy={busy} token={token} dateLabel={occasion?.dateLabel || 'Birthday'} />}
    </div>
  )
}

/* ------------------------------------------------------------------ GCash tab */
function GcashTab({ data, setData, run, call, busy }) {
  const { page, contributions } = data
  const [form, setForm] = useState({ senderName: '', amount: '' })
  const paidTotal = contributions.filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div className="space-y-5">
      {!page.gcash_number && (
        <p className="card text-sm text-slate-600">GCash is off. Add your number in <strong>Settings</strong> to let friends send you money.</p>
      )}
      <div className="card flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">Confirmed total</span>
        <span className="font-display text-2xl font-bold text-emerald-600">{peso(paidTotal)}</span>
      </div>

      {contributions.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">No contributions yet.</p>
      ) : (
        <ul className="space-y-3">
          {contributions.map((c) => (
            <li key={c.id} className="card !p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{c.sender_name || 'Someone'} · {peso(c.amount)}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(c.created_at)}</p>
                </div>
                <span className={`badge ${c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {c.proof_signed_url && <a href={c.proof_signed_url} target="_blank" rel="noreferrer noopener" className="btn-ghost btn-sm">View screenshot</a>}
                {c.status === 'pending' && (
                  <button className="btn-primary btn-sm" disabled={busy}
                    onClick={() => run(async () => { await call('mark-paid', { contributionId: c.id }); setData((d) => ({ ...d, contributions: d.contributions.map((x) => x.id === c.id ? { ...x, status: 'paid' } : x) })) }, 'Marked as paid')}>
                    Mark paid
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Log a payment manually</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault()
          run(async () => {
            const r = await call('create-contribution', { senderName: form.senderName, amount: form.amount, status: 'paid' })
            setData((d) => ({ ...d, contributions: [r.contribution, ...d.contributions] }))
            setForm({ senderName: '', amount: '' })
          }, 'Payment logged')
        }}>
          <input className="field" placeholder="From" maxLength={60} value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} aria-label="From" />
          <input className="field" placeholder="Amount (₱)" type="number" inputMode="decimal" min="1" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} aria-label="Amount" />
          <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : 'Add as paid'}</button>
        </form>
      </details>
    </div>
  )
}

/* ------------------------------------------------------------- Settings tab */
function SettingsTab({ page, setData, run, call, busy, token, dateLabel }) {
  const [f, setF] = useState({
    owner_name: page.owner_name,
    title: page.title,
    letter: page.letter,
    birthday_date: page.birthday_date,
    reveal_at: toLocalInput(page.reveal_at),
    gcash_number: page.gcash_number || '',
    theme: page.theme || 'confetti',
    auto_approve_wishes: !!page.auto_approve_wishes,
    is_published: !!page.is_published,
  })
  const [qrError, setQrError] = useState('')
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const save = (e) => {
    e.preventDefault()
    run(async () => {
      const r = await call('update', {
        patch: { ...f, reveal_at: fromLocalInput(f.reveal_at), gcash_number: f.gcash_number.trim() || null },
      })
      setData((d) => ({ ...d, page: r.page }))
    }, 'Saved')
  }

  async function uploadQr(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const msg = validateImage(file, 5 * 1024 * 1024)
    if (msg) return setQrError(msg)
    setQrError('')
    run(async () => {
      const fd = new FormData()
      fd.set('editToken', token)
      fd.set('action', 'upload-qr')
      fd.set('file', file)
      const r = await postForm('manage-page', fd)
      setData((d) => ({ ...d, page: r.page }))
    }, 'QR uploaded')
  }

  return (
    <form onSubmit={save} className="card space-y-5">
      <div>
        <label className="label" htmlFor="s-name">Your name</label>
        <input id="s-name" className="field" required maxLength={60} value={f.owner_name} onChange={set('owner_name')} />
      </div>
      <div>
        <label className="label" htmlFor="s-title">Page title</label>
        <input id="s-title" className="field" required maxLength={120} value={f.title} onChange={set('title')} />
      </div>
      <div>
        <label className="label" htmlFor="s-letter">Letter</label>
        <textarea id="s-letter" className="field min-h-[200px]" required maxLength={8000} value={f.letter} onChange={set('letter')} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-bday">{dateLabel}</label>
          <input id="s-bday" type="date" className="field" required value={f.birthday_date} onChange={set('birthday_date')} />
        </div>
        <div>
          <label className="label" htmlFor="s-reveal">Reveal wishes at</label>
          <input id="s-reveal" type="datetime-local" className="field" value={f.reveal_at} onChange={set('reveal_at')} />
          <p className="hint">Empty = always visible.</p>
        </div>
      </div>

      <div>
        <span className="label">Theme</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(THEMES).map(([id, t]) => (
            <button key={id} type="button" onClick={() => setF((p) => ({ ...p, theme: id }))} aria-pressed={f.theme === id}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold ${f.theme === id ? 'border-ink bg-sun shadow-sticker' : 'border-ink/25 bg-white'}`}>
              <span className="flex -space-x-1.5" aria-hidden="true">{t.swatch.map((c) => <span key={c} className="h-5 w-5 rounded-full border-2 border-ink" style={{ background: c }} />)}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="s-gcash">GCash number</label>
        <input id="s-gcash" inputMode="tel" className="field" value={f.gcash_number} onChange={set('gcash_number')} placeholder="09171234567" maxLength={16} />
        <p className="hint">Clear it to turn GCash off.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {page.gcash_qr_url && <img src={page.gcash_qr_url} alt="Your GCash QR" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />}
          <label className="btn-ghost btn-sm cursor-pointer">
            {page.gcash_qr_url ? 'Replace QR' : 'Upload QR'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadQr} disabled={busy} />
          </label>
          {page.gcash_qr_url && (
            <button type="button" className="btn-ghost btn-sm text-red-600" disabled={busy}
              onClick={() => run(async () => { const r = await call('update', { patch: { gcash_qr_url: null } }); setData((d) => ({ ...d, page: r.page })) }, 'QR removed')}>
              Remove
            </button>
          )}
        </div>
        {qrError && <p role="alert" className="mt-2 text-sm text-red-600">{qrError}</p>}
      </div>

      <div className="space-y-4 border-t border-slate-100 pt-5">
        <Toggle label="Auto-approve wishes" hint="New wishes appear without your review." checked={f.auto_approve_wishes} onChange={(v) => setF((p) => ({ ...p, auto_approve_wishes: v }))} />
        <Toggle label="Page is published" hint="Turn off to hide your page from everyone." checked={f.is_published} onChange={(v) => setF((p) => ({ ...p, is_published: v }))} />
      </div>

      <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  )
}
