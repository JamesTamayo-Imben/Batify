import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../lib/confetti', async (importOriginal) => ({
  ...await importOriginal(),
  fireConfetti: vi.fn(),
}))
import Envelope3D, { useEnvelope } from '../components/Envelope3D'
import FlipCountdown from '../components/FlipCountdown'
import GiftBox3D from '../components/GiftBox3D'
import GiftPicker from '../components/GiftPicker'
import CampaignSettings from '../components/CampaignEditor'
import Turnstile from '../components/Turnstile'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { hasOpened, markOpened, wishUnwrapped } from '../lib/opened'
import { WishItem } from '../pages/PublicPage'
import { themeOf } from '../lib/themes'
import { giftOptionsFor, isCampaignActive } from '../lib/campaigns'

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); sessionStorage.clear() })

describe('themes', () => {
  it('keeps database ids and falls back safely', () => {
    expect(themeOf('lavender')).toBe('lavender')
    expect(themeOf('nope')).toBe('confetti')
    expect(themeOf(undefined)).toBe('confetti')
  })
})

describe('seasonal campaigns', () => {
  it('activates recurring campaign dates in Philippine time', () => {
    const christmas = {
      is_enabled: true, start_month: 11, start_day: 1, end_month: 12, end_day: 31,
    }
    expect(isCampaignActive(christmas, new Date('2026-10-31T23:59:00+08:00'))).toBe(false)
    expect(isCampaignActive(christmas, new Date('2026-11-01T00:00:00+08:00'))).toBe(true)
    expect(isCampaignActive({ ...christmas, is_enabled: false }, new Date('2026-12-01T12:00:00+08:00'))).toBe(false)
  })

  it('handles a campaign that spans New Year', () => {
    const holiday = {
      is_enabled: true, start_month: 12, start_day: 24, end_month: 1, end_day: 5,
    }
    expect(isCampaignActive(holiday, new Date('2027-01-05T23:59:00+08:00'))).toBe(true)
    expect(isCampaignActive(holiday, new Date('2027-01-06T00:00:00+08:00'))).toBe(false)
  })

  it('limits event gift choices to configured catalog items', () => {
    const options = giftOptionsFor({
      id: 'christmas',
      gift_options: { teddy: 'Pamasko', unknown: 'Ignored', flower: '' },
    })
    expect(options).toEqual({ teddy: 'Pamasko' })
  })

  it('renders only event-approved gift choices', () => {
    render(<GiftPicker value="teddy" options={{ teddy: 'Pamasko' }} onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Pamasko' })).toBeTruthy()
    expect(screen.queryByRole('radio', { name: 'Flowers' })).toBeNull()
  })

  it('saves admin campaign dates, copy, activation, and suggested gifts', async () => {
    const onSave = vi.fn()
    render(<CampaignSettings busy={false} onSave={onSave} campaigns={[{
      id: 'christmas',
      title: 'Christmas Pamasko',
      description: 'Share gifts',
      is_enabled: true,
      start_month: 11,
      start_day: 1,
      end_month: 12,
      end_day: 31,
      gift_options: { flower: 'Holiday flowers', teddy: 'Christmas teddy' },
    }]} />)

    fireEvent.change(screen.getByLabelText('Campaign title'), { target: { value: 'Pamasko time' } })
    fireEvent.change(screen.getByLabelText('Starts (MM-DD)'), { target: { value: '10-15' } })
    fireEvent.click(screen.getByLabelText('Enabled'))
    fireEvent.click(screen.getByLabelText('Suggest Teddy bear'))
    fireEvent.click(screen.getByRole('button', { name: 'Save campaign' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      campaignId: 'christmas',
      title: 'Pamasko time',
      isEnabled: false,
      startMonth: 10,
      startDay: 15,
      giftOptions: { flower: 'Holiday flowers' },
    })))
  })
})

describe('storage helpers', () => {
  it('remembers opened letters per slug', () => {
    expect(hasOpened('a')).toBe(false)
    markOpened('a')
    expect(hasOpened('a')).toBe(true)
    expect(hasOpened('b')).toBe(false)
  })
  it('round-trips a draft and survives corrupt JSON', () => {
    saveDraft({ ownerName: 'Maria' })
    expect(loadDraft()).toEqual({ ownerName: 'Maria' })
    localStorage.setItem('batify:draft', '{not json')
    expect(loadDraft()).toBeNull()
    clearDraft()
    expect(loadDraft()).toBeNull()
  })
})

describe('useEnvelope', () => {
  beforeEach(() => vi.useFakeTimers())
  it('steps up in order and back down', () => {
    const seen = []
    const { result } = renderHook(() => useEnvelope({ max: 4, onStep: (n) => seen.push(n) }))
    act(() => result.current.open())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(seen).toEqual([1, 2, 3, 4])
    expect(result.current.step).toBe(4)
    act(() => result.current.close())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.step).toBe(0)
    expect(seen.slice(4)).toEqual([3, 2, 1, 0])
  })
  it('respects max and an initial step', () => {
    const { result } = renderHook(() => useEnvelope({ max: 3, initial: 3 }))
    expect(result.current.step).toBe(3)
    act(() => result.current.goTo(9))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.step).toBe(3)
  })
  it('jumps straight to the target with reduced motion', () => {
    window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} })
    const { result } = renderHook(() => useEnvelope({ max: 4 }))
    act(() => result.current.open())
    expect(result.current.step).toBe(4)
    window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })
  })
  it('clears timers on unmount', () => {
    const { result, unmount } = renderHook(() => useEnvelope({ max: 4 }))
    act(() => result.current.open())
    unmount()
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
  })
})

describe('Turnstile', () => {
  it('explains when the current hostname is not authorized', async () => {
    const previous = window.turnstile
    let options
    window.turnstile = {
      render: vi.fn((_box, config) => { options = config; return 'widget-id' }),
      remove: vi.fn(),
    }
    const onToken = vi.fn()
    const onError = vi.fn()
    const { unmount } = render(<Turnstile onToken={onToken} onError={onError} />)

    try {
      await waitFor(() => expect(options).toBeTruthy())
      act(() => options['error-callback'](110200))

      expect(onToken).toHaveBeenCalledWith('')
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('not authorized'))
    } finally {
      unmount()
      if (previous) window.turnstile = previous
      else delete window.turnstile
    }
  })
})

describe('Envelope3D', () => {
  it('applies cumulative step classes and exposes one accessible button while sealed', () => {
    const onActivate = vi.fn()
    const { container, rerender } = render(<Envelope3D step={0} interactive onActivate={onActivate} initial="m" label="Open it" />)
    expect(container.querySelector('.env').className).not.toMatch(/s1/)
    screen.getByRole('button', { name: 'Open it' }).click()
    expect(onActivate).toHaveBeenCalledOnce()
    rerender(<Envelope3D step={3} interactive onActivate={onActivate} />)
    const cls = container.querySelector('.env').className
    expect(cls).toMatch(/s1/); expect(cls).toMatch(/s2/); expect(cls).toMatch(/s3/); expect(cls).not.toMatch(/s4/)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('FlipCountdown', () => {
  it('announces remaining time to screen readers and fires onDone once', () => {
    vi.useFakeTimers()
    const done = vi.fn()
    render(<FlipCountdown target={Date.now() + 2 * 86400000 + 3600000} onDone={done} />)
    expect(screen.getByRole('timer').textContent).toMatch(/2 days, 1 hours/)
    cleanup()
    render(<FlipCountdown target={Date.now() - 1000} onDone={done} />)
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('GiftBox3D', () => {
  it('toggles the lid class and is hidden from assistive tech', () => {
    const { container, rerender } = render(<GiftBox3D gift="teddy" />)
    const el = container.querySelector('.gb')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.className).not.toMatch(/is-open/)
    rerender(<GiftBox3D gift="teddy" open />)
    expect(container.querySelector('.gb').className).toMatch(/is-open/)
  })
})

describe('WishItem', () => {
  const wishes = ['a', 'b', 'c'].map((id, index) => ({
    id, sender_name: `Sender ${index + 1}`, gift_type: 'flower',
    created_at: '2026-10-17T00:00:00.000Z', message: 'Happy birthday!',
  }))

  function WishHarness() {
    const [command, setCommand] = useState({ action: null, token: 0 })
    const run = (action) => setCommand(({ token }) => ({ action, token: token + 1 }))
    return (
      <div>
        <button onClick={() => run('unwrap')}>Unwrap all</button>
        <button onClick={() => run('wrap')}>Wrap all</button>
        {wishes.map((wish, index) => (
          <WishItem key={wish.id} wish={wish} index={index} bulkAction={command.action} bulkToken={command.token} />
        ))}
      </div>
    )
  }

  beforeEach(() => vi.useFakeTimers())

  it('unwraps and wraps all wishes in order', () => {
    render(<WishHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Unwrap all' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(wishes.every(({ id }) => wishUnwrapped(id))).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Wrap all' }))
    act(() => vi.advanceTimersByTime(800))
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: /Unwrap the gift from Sender/ })).toHaveLength(3)
    expect(wishes.every(({ id }) => !wishUnwrapped(id))).toBe(true)
  })

  it('wraps an individual wish and clears its saved open state', () => {
    const wish = wishes[0]
    render(<WishItem wish={wish} index={0} bulkAction={null} bulkToken={0} />)
    fireEvent.click(screen.getByRole('button', { name: `Unwrap the gift from ${wish.sender_name}` }))
    act(() => vi.advanceTimersByTime(650))
    expect(wishUnwrapped(wish.id)).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Wrap gift' }))
    act(() => vi.advanceTimersByTime(450))
    expect(screen.getByRole('button', { name: `Unwrap the gift from ${wish.sender_name}` })).toBeTruthy()
    expect(wishUnwrapped(wish.id)).toBe(false)
  })
})

describe('product rules', () => {
  it('uses no emoji anywhere in the source', () => {
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/u
    const hits = []
    const walk = (dir) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name)
        if (f.isDirectory()) walk(p)
        else if (/\.(jsx?|css|html)$/.test(f.name) && !p.includes(`${path.sep}test${path.sep}`)) {
          fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (emoji.test(l)) hits.push(`${p}:${i + 1}`) })
        }
      }
    }
    walk(path.resolve(__dirname, '..'))
    expect(hits).toEqual([])
  })
})
