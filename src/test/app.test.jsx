import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
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
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { hasOpened, markOpened, wishUnwrapped } from '../lib/opened'
import { WishItem } from '../pages/PublicPage'
import { themeOf } from '../lib/themes'

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); sessionStorage.clear() })

describe('themes', () => {
  it('keeps database ids and falls back safely', () => {
    expect(themeOf('lavender')).toBe('lavender')
    expect(themeOf('nope')).toBe('confetti')
    expect(themeOf(undefined)).toBe('confetti')
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
