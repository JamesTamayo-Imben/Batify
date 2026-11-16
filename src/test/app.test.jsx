import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../lib/confetti', async (importOriginal) => ({
  ...await importOriginal(),
  fireConfetti: vi.fn(),
}))
vi.mock('../lib/ajax', () => ({ postJSON: vi.fn() }))
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { postJSON } from '../lib/ajax'
import Envelope3D, { useEnvelope } from '../components/Envelope3D'
import FlipCountdown from '../components/FlipCountdown'
import GiftBox3D from '../components/GiftBox3D'
import GiftPicker from '../components/GiftPicker'
import ShareOptions from '../components/ShareOptions'
import SeasonalOpener from '../components/SeasonalOpener'
import Snowfall from '../components/Snowfall'
import { LogoMark } from '../components/Logo'
import ThemePicker from '../components/ThemePicker'
import CampaignSettings from '../components/CampaignEditor'
import CampaignThemeProvider, { useCampaignTheme } from '../components/CampaignThemeProvider'
import Turnstile from '../components/Turnstile'
import AboutDeveloper from '../pages/AboutDeveloper'
import Admin from '../pages/Admin'
import Contact from '../pages/Contact'
import EditPage from '../pages/EditPage'
import { CampaignCard } from '../pages/Home'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { hasOpened, markOpened, wishUnwrapped } from '../lib/opened'
import { WishItem } from '../pages/PublicPage'
import { DEFAULT_CUSTOM_COLOR, themeOf, themeStyleOf } from '../lib/themes'
import { giftOptionsFor, isCampaignActive, isEventDateNotPast, isEventDateWithin30Days, isPriorityPreviewAvailable, isValidCampaignEventDate, millisecondsUntilManilaMidnight, OCCASIONS, priorityEventCountdown, priorityThemeFor, previewThemeForCampaign, upcomingCampaignDate } from '../lib/campaigns'
import { isPageExpired } from '../lib/pages'
import { sb } from '../lib/supabase'

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); sessionStorage.clear() })

describe('themes', () => {
  it('keeps database ids and falls back safely', () => {
    expect(themeOf('lavender')).toBe('lavender')
    expect(themeOf('nope')).toBe('confetti')
    expect(themeOf('__proto__')).toBe('confetti')
    expect(themeOf(undefined)).toBe('confetti')
    expect(themeOf('rosas')).toBe('rosas')
  })

  it('derives custom palettes with readable text contrast', () => {
    const luminance = (rgb) => {
      const channels = rgb.map((value) => {
        const channel = value / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    }
    const contrast = (a, b) => {
      const first = luminance(a)
      const second = luminance(b)
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
    }

    for (const color of ['#FFFFFF', '#FFFF00', '#00A8E8', '#2014AA']) {
      const palette = themeStyleOf(color)
      const ground = palette['--ground'].split(' ').map(Number)
      const accent = palette['--accent'].split(' ').map(Number)
      expect(themeOf(color)).toBe('custom')
      expect(contrast([20, 20, 43], ground)).toBeGreaterThanOrEqual(4.5)
      expect(contrast([255, 255, 255], accent)).toBeGreaterThanOrEqual(4.5)
    }
    expect(themeStyleOf('#123')).toBeUndefined()
  })

  it('lets a page owner select presets or a personalized color', () => {
    const onChange = vi.fn()
    function StatefulPicker() {
      const [theme, setTheme] = useState('confetti')
      return <ThemePicker value={theme} onChange={(nextTheme) => { onChange(nextTheme); setTheme(nextTheme) }} idPrefix="theme-test" />
    }
    render(<StatefulPicker />)

    expect(screen.getByRole('radio', { name: /Alon/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /Personalized/ }))
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_CUSTOM_COLOR)

    fireEvent.change(screen.getByLabelText('Choose a custom theme color'), { target: { value: '#1478c8' } })
    expect(onChange).toHaveBeenLastCalledWith('#1478C8')
  })
})

describe('seasonal campaigns', () => {
  it('activates recurring campaign dates in Philippine time', () => {
    const christmas = {
      is_enabled: true, start_month: 11, start_day: 25, end_month: 12, end_day: 25,
    }
    expect(isCampaignActive(christmas, new Date('2026-11-24T23:59:00+08:00'))).toBe(false)
    expect(isCampaignActive(christmas, new Date('2026-11-25T00:00:00+08:00'))).toBe(true)
    expect(isCampaignActive(christmas, new Date('2026-12-26T00:00:00+08:00'))).toBe(false)
    expect(isCampaignActive({ ...christmas, is_enabled: false }, new Date('2026-12-01T12:00:00+08:00'))).toBe(false)
  })

  describe('page expiry', () => {
    it('treats a page as expired at its deadline but not before it', () => {
      const expiresAt = '2026-12-26T00:00:00+08:00'
      expect(isPageExpired(expiresAt, new Date('2026-12-25T23:59:59+08:00'))).toBe(false)
      expect(isPageExpired(expiresAt, new Date(expiresAt))).toBe(true)
      expect(isPageExpired(null, new Date(expiresAt))).toBe(false)
    })
  })

  it('handles a campaign that spans New Year', () => {
    const holiday = {
      is_enabled: true, start_month: 12, start_day: 2, end_month: 1, end_day: 1,
    }
    expect(isCampaignActive(holiday, new Date('2026-12-01T23:59:00+08:00'))).toBe(false)
    expect(isCampaignActive(holiday, new Date('2026-12-02T00:00:00+08:00'))).toBe(true)
    expect(isCampaignActive(holiday, new Date('2027-01-01T23:59:00+08:00'))).toBe(true)
    expect(isCampaignActive(holiday, new Date('2027-01-02T00:00:00+08:00'))).toBe(false)
  })

  it('only offers priority theme previews during the two weeks before campaign opening', () => {
    const christmas = {
      id: 'christmas', is_enabled: true, is_priority: true,
      start_month: 11, start_day: 25, end_month: 12, end_day: 25,
    }
    expect(isPriorityPreviewAvailable(christmas, new Date('2026-11-10T12:00:00+08:00'))).toBe(false)
    expect(isPriorityPreviewAvailable(christmas, new Date('2026-11-11T12:00:00+08:00'))).toBe(true)
    expect(isPriorityPreviewAvailable(christmas, new Date('2026-11-24T12:00:00+08:00'))).toBe(true)
    expect(isPriorityPreviewAvailable(christmas, new Date('2026-11-25T12:00:00+08:00'))).toBe(false)
    expect(isPriorityPreviewAvailable({ ...christmas, is_enabled: false }, new Date('2026-11-20T12:00:00+08:00'))).toBe(false)
  })

  it('defaults seasonal pages to the upcoming configured event date', () => {
    expect(upcomingCampaignDate(
      { id: 'christmas', end_month: 12, end_day: 25 },
      new Date('2026-11-15T12:00:00+08:00'),
    )).toBe('2026-12-25')
    expect(upcomingCampaignDate(
      { id: 'new_year', end_month: 1, end_day: 1 },
      new Date('2026-12-20T12:00:00+08:00'),
    )).toBe('2027-01-01')
    expect(upcomingCampaignDate(
      { id: 'christmas', end_month: 12, end_day: 25 },
      new Date('2026-12-25T12:00:00+08:00'),
    )).toBe('2026-12-25')
    expect(upcomingCampaignDate(
      { id: 'anniversary', end_month: 12, end_day: 31 },
      new Date('2026-06-20T12:00:00+08:00'),
    )).toBeNull()
  })

  it('counts down to the next priority event date and its end on event day', () => {
    const christmas = {
      id: 'christmas', title: 'Christmas', is_enabled: true, is_priority: true,
      start_month: 11, start_day: 25, end_month: 12, end_day: 25,
    }
    expect(priorityEventCountdown([christmas], new Date('2026-11-16T12:00:00+08:00'))).toMatchObject({
      date: '2026-12-25',
      target: new Date('2026-12-25T00:00:00+08:00').getTime(),
    })
    expect(priorityEventCountdown([christmas], new Date('2026-12-25T12:00:00+08:00'))).toMatchObject({
      date: '2026-12-25',
      target: new Date('2026-12-26T00:00:00+08:00').getTime(),
    })
  })

  it('accepts the configured event date even when it is more than 30 days away', () => {
    const now = new Date('2026-11-16T12:00:00+08:00')
    const christmas = { id: 'christmas', end_month: 12, end_day: 25 }
    expect(isEventDateWithin30Days('2026-12-25', now)).toBe(false)
    expect(isValidCampaignEventDate('2026-12-25', christmas, now)).toBe(true)
    expect(isValidCampaignEventDate('2027-01-01', christmas, now)).toBe(false)
  })

  it('requires the configured date for priority campaigns', () => {
    const now = new Date('2026-11-16T12:00:00+08:00')
    const christmas = { id: 'christmas', is_priority: true, end_month: 12, end_day: 25 }
    expect(isValidCampaignEventDate('2026-12-25', christmas, now)).toBe(true)
    expect(isValidCampaignEventDate('2026-12-20', christmas, now)).toBe(false)
  })

  it('uses Christmas-specific writing prompts and greeting language', () => {
    const christmas = OCCASIONS.christmas
    expect(christmas.starters.length).toBeGreaterThanOrEqual(8)
    expect(christmas.starterHeading).toContain('Christmas')
    expect(christmas.starters.join(' ').toLowerCase()).not.toContain('wish')
    expect(christmas.messageLabel).toBe('Your Christmas greeting')
    expect(christmas.collectionLabel).toBe('Christmas greetings')
  })

  it('applies priority themes only within enabled windows and lets Christmas win overlaps', () => {
    const christmas = {
      id: 'christmas', is_enabled: true, is_priority: true,
      start_month: 11, start_day: 25, end_month: 12, end_day: 25,
    }
    const newYear = {
      id: 'new_year', is_enabled: true, is_priority: true,
      start_month: 12, start_day: 2, end_month: 1, end_day: 1,
    }
    const anniversary = {
      id: 'anniversary', is_enabled: true, is_priority: true,
      start_month: 1, start_day: 1, end_month: 12, end_day: 31,
    }

    expect(priorityThemeFor([christmas, newYear, anniversary], new Date('2026-12-20T12:00:00+08:00'))).toBe('christmas')
    expect(priorityThemeFor([christmas, newYear, anniversary], new Date('2026-12-26T12:00:00+08:00'))).toBe('new_year')
    expect(priorityThemeFor([{ ...christmas, is_priority: false }], new Date('2026-12-20T12:00:00+08:00'))).toBeNull()
    expect(priorityThemeFor([{ ...christmas, is_enabled: false }], new Date('2026-12-20T12:00:00+08:00'))).toBeNull()
    expect(priorityThemeFor([anniversary], new Date('2026-06-20T12:00:00+08:00'))).toBeNull()
    expect(previewThemeForCampaign(anniversary)).toBe('anniversary')
  })

  it.each([
    ['christmas', 'Christmas'],
    ['halloween', 'Halloween'],
    ['valentines', "Valentine's Day"],
    ['new_year', 'New Year'],
  ])('does not offer a redundant preview for active priority event %s', (id, label) => {
    render(
      <MemoryRouter>
        <CampaignCard
          campaign={{ id, title: label, description: 'Share a link', is_priority: true }}
          isActive
          previewThemeId={null}
          setPreviewThemeId={vi.fn()}
          themeId={null}
          setSystemThemeEnabled={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: `Preview ${label} theme` })).toBeNull()
  })

  it('lets visitors select an active event theme even when another event theme is active', () => {
    const setSystemThemeEnabled = vi.fn()
    const setPreviewThemeId = vi.fn()
    render(
      <MemoryRouter>
        <CampaignCard
          campaign={{ id: 'halloween', title: 'Halloween', description: 'Share a link', is_priority: true }}
          isActive
          previewThemeId={null}
          setPreviewThemeId={setPreviewThemeId}
          themeId="christmas"
          setSystemThemeEnabled={setSystemThemeEnabled}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Turn on Halloween theme' }))
    expect(setPreviewThemeId).toHaveBeenCalledWith('halloween')
    expect(setSystemThemeEnabled).not.toHaveBeenCalled()
  })

  it('turns off the system theme when its active event card is toggled off', () => {
    const setSystemThemeEnabled = vi.fn()
    render(
      <MemoryRouter>
        <CampaignCard
          campaign={{ id: 'christmas', title: 'Christmas', description: 'Share a link', is_priority: true }}
          isActive
          previewThemeId={null}
          setPreviewThemeId={vi.fn()}
          themeId="christmas"
          setSystemThemeEnabled={setSystemThemeEnabled}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Turn off Christmas theme' }))
    expect(setSystemThemeEnabled).toHaveBeenCalledWith(false)
  })

  it('offers a preview for a priority event outside its active window', () => {
    render(
      <MemoryRouter>
        <CampaignCard
          campaign={{ id: 'christmas', title: 'Christmas', description: 'Share a link', is_priority: true }}
          isActive={false}
          previewThemeId={null}
          setPreviewThemeId={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Preview Christmas theme' })).toBeTruthy()
  })

  it('only offers priority previews for priority campaigns, while Anniversary stays previewable', () => {
    expect(previewThemeForCampaign({ id: 'christmas', is_priority: true })).toBe('christmas')
    expect(previewThemeForCampaign({ id: 'christmas', is_priority: false })).toBeNull()
    expect(previewThemeForCampaign({ id: 'anniversary', is_priority: false })).toBe('anniversary')
  })

  it('offers out-of-window priority previews and keeps the Anniversary preview available', () => {
    const setPreviewThemeId = vi.fn()
    const { rerender } = render(
      <MemoryRouter>
        <CampaignCard
          campaign={{ id: 'christmas', title: 'Christmas', description: 'Holiday wishes', is_priority: true }}
          isActive={false}
          previewThemeId={null}
          setPreviewThemeId={setPreviewThemeId}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Preview Christmas theme' })).toBeTruthy()

    rerender(
      <MemoryRouter>
        <CampaignCard
          campaign={{ id: 'anniversary', title: 'Anniversary', description: 'Share a link' }}
          isActive={false}
          previewThemeId={null}
          setPreviewThemeId={setPreviewThemeId}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Preview Anniversary theme' })).toBeTruthy()
  })

  it('lets visitors toggle a local Anniversary preview without changing priority rules', () => {
    function StatefulCampaignCard() {
      const [previewThemeId, setPreviewThemeId] = useState(null)
      return (
        <CampaignCard
          campaign={{ id: 'anniversary', title: 'Anniversary', description: 'Share a link' }}
          isActive={false}
          previewThemeId={previewThemeId}
          setPreviewThemeId={setPreviewThemeId}
        />
      )
    }

    render(<MemoryRouter><StatefulCampaignCard /></MemoryRouter>)
    const button = screen.getByRole('button', { name: /Preview Anniversary theme/ })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('Link creation opens during the event.')).toBeTruthy()

    fireEvent.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Turn off theme preview/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Turn off theme preview/ }))
    expect(screen.getByRole('button', { name: /Preview Anniversary theme/ }).getAttribute('aria-pressed')).toBe('false')
  })

  it('lets visitors turn off and restore the system seasonal theme on this device', async () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(new Date())
    const month = Number(parts.find((part) => part.type === 'month').value)
    const day = Number(parts.find((part) => part.type === 'day').value)
    const campaign = {
      id: 'christmas',
      is_enabled: true,
      is_priority: true,
      start_month: month,
      start_day: day,
      end_month: month,
      end_day: day,
    }
    const query = { select: vi.fn(() => query), eq: vi.fn(() => Promise.resolve({ data: [campaign], error: null })) }
    const from = vi.spyOn(sb, 'from').mockReturnValue(query)
    const audio = {
      paused: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      pause: vi.fn(() => { audio.paused = true }),
      play: vi.fn(() => {
        audio.paused = false
        return Promise.resolve()
      }),
    }
    const audioConstructor = vi.spyOn(window, 'Audio').mockImplementation(() => audio)

    try {
      const { container, unmount } = render(<CampaignThemeProvider><p>Home</p></CampaignThemeProvider>)
      await waitFor(() => expect(from).toHaveBeenCalledWith('campaign_events'))
      await waitFor(() => expect(container.firstElementChild.getAttribute('data-theme')).toBe('christmas'))
      await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1))
      expect(audio.loop).toBe(true)

      fireEvent.click(screen.getByRole('button', { name: 'Turn off Christmas theme' }))
      expect(container.firstElementChild.getAttribute('data-theme')).toBe('confetti')
      expect(audio.paused).toBe(false)
      expect(localStorage.getItem('batify:disable-seasonal-theme')).toBe('true')
      const themeButton = screen.getByRole('button', { name: 'Turn on Christmas theme' })
      const musicButton = screen.getByRole('button', { name: 'Turn off Christmas music' })
      expect(themeButton.parentElement).toBe(musicButton.parentElement)
      fireEvent.click(musicButton)
      expect(audio.paused).toBe(true)

      unmount()
      const reloaded = render(<CampaignThemeProvider><p>Home</p></CampaignThemeProvider>)
      await waitFor(() => expect(reloaded.container.firstElementChild.getAttribute('data-theme')).toBe('confetti'))
      expect(screen.getByRole('button', { name: 'Turn on Christmas theme' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Turn on Christmas music' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Turn on Christmas theme' }))
      expect(reloaded.container.firstElementChild.getAttribute('data-theme')).toBe('christmas')
      expect(audio.play).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'Turn on Christmas music' }))
      await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(2))
    } finally {
      audioConstructor.mockRestore()
      from.mockRestore()
    }
  })

  it('keeps a local preview easy to turn off after leaving the campaign card', async () => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => Promise.resolve({ data: [], error: null })) }
    const from = vi.spyOn(sb, 'from').mockReturnValue(query)
    const audio = {
      paused: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      pause: vi.fn(() => { audio.paused = true }),
      play: vi.fn(() => {
        audio.paused = false
        return Promise.resolve()
      }),
    }
    const audioConstructor = vi.spyOn(window, 'Audio').mockImplementation(() => audio)
    function PreviewControls() {
      const { setPreviewThemeId } = useCampaignTheme()
      return <button type="button" onClick={() => setPreviewThemeId('christmas')}>Start preview</button>
    }

    try {
      const { container } = render(<CampaignThemeProvider><PreviewControls /></CampaignThemeProvider>)
      await waitFor(() => expect(from).toHaveBeenCalledWith('campaign_events'))
      fireEvent.click(screen.getByRole('button', { name: 'Start preview' }))
      expect(screen.getByRole('status').textContent).toBe('Previewing Christmas theme on this device.')
      expect(container.querySelector('[data-theme]').getAttribute('data-theme')).toBe('christmas')

      fireEvent.click(screen.getByRole('button', { name: 'Turn off Christmas theme preview' }))
      expect(screen.queryByRole('status')).toBeNull()
      expect(container.querySelector('[data-theme]').getAttribute('data-theme')).toBe('confetti')
    } finally {
      audioConstructor.mockRestore()
      from.mockRestore()
    }
  })

  it('renders falling snowflakes with branched arms', () => {
    const { container } = render(<Snowfall />)
    expect(container.querySelectorAll('.snowflake')).toHaveLength(18)
    expect(container.querySelector('.snowflake svg path')?.getAttribute('d')).toContain('L38 12')
  })

  it('resolves every seasonal priority theme from its own configured window', () => {
    const cases = [
      ['halloween', 10, 1, 10, 31, '2026-10-15T12:00:00+08:00'],
      ['valentines', 1, 15, 2, 14, '2026-02-01T12:00:00+08:00'],
      ['new_year', 12, 2, 1, 1, '2026-12-26T12:00:00+08:00'],
    ]
    for (const [id, start_month, start_day, end_month, end_day, date] of cases) {
      expect(priorityThemeFor([{
        id, is_enabled: true, is_priority: true, start_month, start_day, end_month, end_day,
      }], new Date(date))).toBe(id)
    }
  })

  it('schedules the next theme check at Philippine midnight', () => {
    expect(millisecondsUntilManilaMidnight(new Date('2026-11-25T15:59:30.000Z'))).toBe(30050)
  })

  it('accepts event dates from today through 30 days ahead in Philippine time', () => {
    const today = new Date('2026-11-25T00:00:00+08:00')
    expect(isEventDateWithin30Days('2026-11-25', today)).toBe(true)
    expect(isEventDateWithin30Days('2026-12-25', today)).toBe(true)
    expect(isEventDateWithin30Days('2026-12-26', today)).toBe(false)
    expect(isEventDateWithin30Days('2026-11-24', today)).toBe(false)
    expect(isEventDateWithin30Days('2026-02-30', today)).toBe(false)
  })

  it('allows future personal anniversaries outside the fixed-event window', () => {
    const today = new Date('2026-11-25T00:00:00+08:00')
    expect(isEventDateNotPast('2027-02-14', today)).toBe(true)
    expect(isEventDateNotPast('2026-11-24', today)).toBe(false)
  })

  it('hides a campaign after its final event date', () => {
    const halloween = {
      is_enabled: true, start_month: 10, start_day: 1, end_month: 10, end_day: 31,
    }
    expect(isCampaignActive(halloween, new Date('2026-10-31T23:59:00+08:00'))).toBe(true)
    expect(isCampaignActive(halloween, new Date('2026-11-01T00:00:00+08:00'))).toBe(false)
  })

  it('limits event gift choices to configured catalog items', () => {
    const options = giftOptionsFor({
      id: 'christmas',
      gift_options: { book: 'Holiday read', teddy: 'Pamasko', unknown: 'Ignored', flower: '' },
    })
    expect(options).toEqual({ book: 'Holiday read', teddy: 'Pamasko' })
  })

  it('offers the added birthday gifts in the wish picker', () => {
    render(<GiftPicker value="cake" onChange={() => {}} />)
    for (const label of ['Cake', 'Coffee', 'Book', 'Balloons']) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy()
    }
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
      is_priority: true,
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
    fireEvent.click(screen.getByLabelText('Suggest Cake'))
    fireEvent.click(screen.getByRole('button', { name: 'Save campaign' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      campaignId: 'christmas',
      title: 'Pamasko time',
      isEnabled: false,
      isPriority: true,
      startMonth: 10,
      startDay: 15,
      giftOptions: { flower: 'Holiday flowers', cake: 'Holiday cake' },
    })))
  })

  it('keeps Anniversary permanently outside priority themes', async () => {
    const onSave = vi.fn()
    render(<CampaignSettings busy={false} onSave={onSave} campaigns={[{
      id: 'anniversary',
      title: 'Anniversary',
      description: 'Share a link',
      is_enabled: true,
      is_priority: true,
      start_month: 1,
      start_day: 1,
      end_month: 12,
      end_day: 31,
      gift_options: { flower: 'Anniversary flowers' },
    }]} />)

    expect(screen.getByText('Not a priority event')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save campaign' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      campaignId: 'anniversary',
      isPriority: false,
    })))
  })
})

describe('seasonal opening', () => {
  it('offers a Christmas tree opener and a shake alternative', () => {
    const onActivate = vi.fn()
    const { container } = render(
      <SeasonalOpener
        theme="christmas"
        title="Maria’s Christmas letter"
        step={0}
        onActivate={onActivate}
        treeColor="#1478C8"
        giftBoxColor="#8B2345"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tap the Christmas tree to open the letter' }))
    expect(onActivate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Enable shake to open' })).toBeTruthy()
    expect(container.querySelector('.seasonal-mark path:nth-of-type(2)').getAttribute('fill')).toBe('#1478C8')
    expect(container.querySelector('.seasonal-gift path').getAttribute('fill')).toBe('#8B2345')
  })

  describe('brand mark', () => {
    it('renders the smiling envelope used for Batify branding', () => {
      const { container } = render(<LogoMark />)
      expect(container.querySelector('.logo-smile')).toBeTruthy()
    })
  })

  it.each([
    ['halloween', 'pumpkin'],
    ['valentines', 'heart'],
    ['new_year', 'fireworks'],
  ])('keeps the %s opener themed with shake as an optional alternative', (theme, name) => {
    render(<SeasonalOpener theme={theme} title="Special event wishes" step={0} onActivate={vi.fn()} />)
    expect(screen.getByRole('button', { name: `Tap the ${name} to open the letter` })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enable shake to open' })).toBeTruthy()
  })

  it('opens when the enabled device sensor detects a shake', async () => {
    const originalMotion = window.DeviceMotionEvent
    const onActivate = vi.fn()
    const now = vi.spyOn(Date, 'now')
    Object.defineProperty(window, 'DeviceMotionEvent', {
      configurable: true,
      value: { requestPermission: vi.fn().mockResolvedValue('granted') },
    })
    try {
      render(<SeasonalOpener theme="christmas" title="Holiday wishes" step={0} onActivate={onActivate} />)
      fireEvent.click(screen.getByRole('button', { name: 'Enable shake to open' }))
      await waitFor(() => expect(screen.getByText('Shake enabled. Shake your phone 3 times to open, or tap the Christmas tree.')).toBeTruthy())

      const dispatchMotion = (strength, timestamp) => {
        now.mockReturnValue(timestamp)
        const motion = new Event('devicemotion')
        Object.defineProperty(motion, 'accelerationIncludingGravity', { value: { x: strength, y: 0, z: 0 } })
        act(() => window.dispatchEvent(motion))
      }
      dispatchMotion(20, 1000)
      expect(onActivate).not.toHaveBeenCalled()
      expect(screen.getByRole('status').textContent).toBe('1 of 3 shakes. Shake 2 more times to open.')
      dispatchMotion(0, 1100)
      dispatchMotion(20, 1300)
      expect(onActivate).not.toHaveBeenCalled()
      dispatchMotion(0, 1400)
      dispatchMotion(20, 1600)
      expect(onActivate).toHaveBeenCalledOnce()
      expect(screen.getByRole('status').textContent).toBe('Three shakes detected. Opening your letter…')
    } finally {
      now.mockRestore()
      if (originalMotion === undefined) delete window.DeviceMotionEvent
      else Object.defineProperty(window, 'DeviceMotionEvent', { configurable: true, value: originalMotion })
    }
  })
})

describe('public information pages', () => {
  it('explains the virtual-appreciation idea without requiring a real gift', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AboutDeveloper /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'A small idea, made to be shared.' })).toBeTruthy()
    expect(screen.getByText(/There is no spending required/)).toBeTruthy()
    expect(screen.getByText('— Jimz, developer of Batify')).toBeTruthy()
  })

  it('provides the real contact email through a working mailto link', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Contact /></MemoryRouter>)
    const emailLink = screen.getByRole('link', { name: 'Email Jimz' })
    expect(emailLink.getAttribute('href')).toBe('mailto:jamesttamayo0604@gmail.com?subject=A%20note%20about%20Batify')
  })
})

describe('sharing options', () => {
  it('lets visitors edit the shared message and opens app-specific post drafts', () => {
    render(<ShareOptions title="A Batify letter" text="Send a greeting" url="https://batify.test/p/letter" />)
    fireEvent.click(screen.getByText('Share message & post'))

    const message = screen.getByLabelText('Message to share or post')
    expect(message.value).toBe('Send a greeting')
    fireEvent.change(message, { target: { value: 'Join me in celebrating!' } })

    expect(decodeURIComponent(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href'))).toContain('Join me in celebrating!')
    expect(screen.getByRole('link', { name: 'Telegram' }).getAttribute('href')).toContain('t.me/share/url')
    expect(decodeURIComponent(screen.getByRole('link', { name: 'Facebook' }).getAttribute('href'))).toContain('quote=Join me in celebrating!')
    expect(screen.getByRole('link', { name: 'X' }).getAttribute('href')).toContain('twitter.com/intent/tweet')
    expect(screen.getByRole('link', { name: 'Email' }).getAttribute('href')).toContain('mailto:')
    expect(screen.getByRole('button', { name: 'Copy message & link' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy link only' })).toBeTruthy()
  })
})

describe('edit page settings', () => {
  async function openSettings(expiresAt, campaignType = null) {
    vi.mocked(postJSON).mockResolvedValue({
      page: {
        slug: 'sample',
        owner_name: 'Maria',
        title: 'Birthday letter',
        letter: 'With love',
        birthday_date: '2099-01-02',
        reveal_at: null,
        gcash_number: null,
        gcash_qr_url: null,
        theme: 'confetti',
        auto_approve_wishes: false,
        is_published: false,
        expires_at: expiresAt,
        campaign_type: campaignType,
      },
      wishes: [],
      contributions: [],
    })
    render(
      <MemoryRouter initialEntries={['/edit/test-token']}>
        <Routes><Route path="/edit/:token" element={<EditPage />} /></Routes>
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('tab', { name: 'Settings' }))
    return screen.findByRole('switch', { name: /Page is published/ })
  }

  it('renders settings for a page that has not expired', async () => {
    const publishedToggle = await openSettings('2099-12-31T00:00:00.000Z')
    expect(publishedToggle.disabled).toBe(false)
    expect(screen.getByText('Turn off to hide your page from everyone.')).toBeTruthy()
  })

  it('keeps expired unpublished pages from being republished', async () => {
    const publishedToggle = await openSettings('2020-01-01T00:00:00.000Z')
    expect(publishedToggle.disabled).toBe(true)
    expect(screen.getByText('This page has expired. Update its date to calculate a new expiry.')).toBeTruthy()
  })

  it('uses the Christmas date label in campaign settings', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    }
    const from = vi.spyOn(sb, 'from').mockReturnValue(query)
    try {
      await openSettings('2099-12-31T00:00:00.000Z', 'christmas')
      expect(screen.getByLabelText('Christmas date')).toBeTruthy()
      expect(screen.queryByLabelText('Birthday')).toBeNull()
    } finally {
      from.mockRestore()
    }
  })
})

describe('admin console', () => {
  beforeEach(() => {
    sessionStorage.setItem('batify:admin', 'test-admin-secret')
    vi.mocked(postJSON).mockImplementation(async (_name, body) => {
      if (body.action === 'stats') {
        return { stats: { pages: 4, wishes: 9, pendingWishes: 3, contributions: 2, pendingPay: 1, reports: 1 } }
      }
      if (body.action === 'list-pages') return { pages: [] }
      if (body.action === 'list-wishes') return { wishes: [] }
      if (body.action === 'list-reports') return { reports: [] }
      if (body.action === 'list-contributions') return { contributions: [] }
      if (body.action === 'list-campaigns') return { campaigns: [] }
      return { ok: true }
    })
  })

  it('supports arrow-key tab navigation and opens the pending-wish queue from its metric', async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Admin /></MemoryRouter>)
    const overview = await screen.findByRole('tab', { name: 'Overview' })
    fireEvent.keyDown(overview, { key: 'ArrowRight' })
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Pages' }).getAttribute('aria-selected')).toBe('true'))
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    fireEvent.click(await screen.findByRole('button', { name: /Pending wishes: 3/ }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Wishes' }).getAttribute('aria-selected')).toBe('true'))
    await waitFor(() => expect(postJSON).toHaveBeenCalledWith('admin', expect.objectContaining({
      action: 'list-wishes',
      pending: true,
    })))
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    fireEvent.click(await screen.findByRole('button', { name: /Pending payments: 1/ }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Payments' }).getAttribute('aria-selected')).toBe('true'))
    await waitFor(() => expect(postJSON).toHaveBeenCalledWith('admin', expect.objectContaining({
      action: 'list-contributions',
      pending: true,
    })))
  })

  it('shows a count error instead of presenting stale or zero metrics', async () => {
    vi.mocked(postJSON).mockRejectedValue(new Error('Could not load admin counts: query failed'))
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Admin /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load admin counts: query failed')
    expect(screen.queryByRole('button', { name: /Pages: 0/ })).toBeNull()
  })

  it('explains when the deployed admin function lacks campaign actions', async () => {
    vi.mocked(postJSON).mockImplementation(async (_name, body) => {
      if (body.action === 'stats') {
        return { stats: { pages: 4, wishes: 9, pendingWishes: 3, contributions: 2, pendingPay: 1, reports: 1 } }
      }
      if (body.action === 'list-campaigns') throw new Error('Unknown action.')
      return { ok: true }
    })
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Admin /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('tab', { name: 'Campaigns' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Deploy the latest admin Edge Function')
  })

  it('gives campaign saves an actionable error when the deployed function is outdated', async () => {
    vi.mocked(postJSON).mockImplementation(async (_name, body) => {
      if (body.action === 'stats') {
        return { stats: { pages: 4, wishes: 9, pendingWishes: 3, contributions: 2, pendingPay: 1, reports: 1 } }
      }
      if (body.action === 'list-campaigns') {
        return { campaigns: [{
          id: 'christmas',
          title: 'Christmas Pamasko',
          description: 'Share gifts',
          is_enabled: true,
          start_month: 11,
          start_day: 1,
          end_month: 12,
          end_day: 31,
          gift_options: { flower: 'Holiday flowers' },
        }] }
      }
      if (body.action === 'update-campaign') throw new Error('Unknown action.')
      return { ok: true }
    })
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Admin /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('tab', { name: 'Campaigns' }))
    fireEvent.change(await screen.findByLabelText('Campaign title'), { target: { value: 'New campaign title' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save campaign' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Deploy the latest admin Edge Function')
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
