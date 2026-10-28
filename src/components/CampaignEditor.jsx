import { useEffect, useState } from 'react'
import { GIFTS } from '../lib/gifts'
import { giftOptionsFor, OCCASIONS } from '../lib/campaigns'

function monthDay(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseMonthDay(value) {
  const match = value.match(/^(\d{2})-(\d{2})$/)
  if (!match) return null
  const month = Number(match[1]), day = Number(match[2])
  const lastDay = new Date(Date.UTC(2000, month, 0)).getUTCDate()
  return month >= 1 && month <= 12 && day >= 1 && day <= lastDay ? { month, day } : null
}

function CampaignEditor({ campaign, busy, onSave }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const options = giftOptionsFor(campaign) || {}
    setForm({
      title: campaign.title,
      description: campaign.description,
      isEnabled: campaign.is_enabled,
      start: monthDay(campaign.start_month, campaign.start_day),
      end: monthDay(campaign.end_month, campaign.end_day),
      selected: Object.keys(options),
      labels: { ...OCCASIONS[campaign.id].defaults, ...options },
    })
    setError('')
  }, [campaign])

  if (!form) return null

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    const start = parseMonthDay(form.start)
    const end = parseMonthDay(form.end)
    if (!start || !end) {
      setError('Use valid recurring dates in MM-DD format.')
      return
    }
    if (!form.selected.length) {
      setError('Choose at least one suggested gift.')
      return
    }
    const giftOptions = Object.fromEntries(form.selected.map((id) => [id, form.labels[id]]))
    if (form.selected.some((id) => !form.labels[id]?.trim())) {
      setError('Every suggested gift needs a label.')
      return
    }
    setError('')
    await onSave({
      campaignId: campaign.id,
      title: form.title,
      description: form.description,
      isEnabled: form.isEnabled,
      startMonth: start.month,
      startDay: start.day,
      endMonth: end.month,
      endDay: end.day,
      giftOptions,
    })
  }

  return (
    <form className="card space-y-4" onSubmit={submit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl">{OCCASIONS[campaign.id].label}</h2>
          <p className="mt-1 text-sm text-muted">Season dates recur every year in Philippine time. If the end date is earlier, the campaign spans New Year.</p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={form.isEnabled} onChange={(e) => update('isEnabled', e.target.checked)} />
          Enabled
        </label>
      </div>

      <div>
        <label className="label" htmlFor={`${campaign.id}-title`}>Campaign title</label>
        <input id={`${campaign.id}-title`} className="field" maxLength={80} required value={form.title} onChange={(e) => update('title', e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor={`${campaign.id}-description`}>Description</label>
        <textarea id={`${campaign.id}-description`} className="field min-h-20" maxLength={240} required value={form.description} onChange={(e) => update('description', e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${campaign.id}-start`}>Starts (MM-DD)</label>
          <input id={`${campaign.id}-start`} className="field" inputMode="numeric" maxLength={5} pattern="\d{2}-\d{2}" placeholder="11-01" required value={form.start} onChange={(e) => update('start', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${campaign.id}-end`}>Ends (MM-DD)</label>
          <input id={`${campaign.id}-end`} className="field" inputMode="numeric" maxLength={5} pattern="\d{2}-\d{2}" placeholder="12-31" required value={form.end} onChange={(e) => update('end', e.target.value)} />
        </div>
      </div>
      <fieldset>
        <legend className="label">Suggested gifts and labels</legend>
        <div className="space-y-2">
          {GIFTS.map((gift) => {
            const checked = form.selected.includes(gift.id)
            return (
              <div key={gift.id} className="flex items-center gap-3">
                <input type="checkbox" aria-label={`Suggest ${gift.label}`} checked={checked}
                  onChange={(e) => update('selected', e.target.checked
                    ? [...form.selected, gift.id]
                    : form.selected.filter((id) => id !== gift.id))} />
                <input className="field" aria-label={`${gift.label} campaign label`} maxLength={40}
                  value={form.labels[gift.id] || ''} disabled={!checked}
                  onChange={(e) => update('labels', { ...form.labels, [gift.id]: e.target.value })} />
              </div>
            )
          })}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm font-semibold text-flag">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save campaign'}</button>
    </form>
  )
}

export default function CampaignSettings({ campaigns, busy, onSave }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Enabled campaigns appear automatically during their date window. New pages are blocked outside the window; existing links keep working.</p>
      {campaigns.map((campaign) => (
        <CampaignEditor key={campaign.id} campaign={campaign} busy={busy} onSave={onSave} />
      ))}
    </div>
  )
}
