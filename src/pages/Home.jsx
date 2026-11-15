import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Banderitas from '../components/Banderitas'
import Envelope3D, { useEnvelope } from '../components/Envelope3D'
import FlipCountdown from '../components/FlipCountdown'
import GiftBox3D from '../components/GiftBox3D'
import GiftArt from '../components/art/GiftArt'
import Icon from '../components/Icon'
import { SLOTS } from '../lib/ads'
import { GIFTS } from '../lib/gifts'
import { fireConfetti } from '../lib/confetti'
import { CAMPAIGN_COLUMNS, isCampaignActive, occasionOf, previewThemeForCampaign } from '../lib/campaigns'
import { FAQS } from '../lib/faqs'
import { sb } from '../lib/supabase'
import { useCampaignTheme } from '../components/CampaignThemeProvider'
import useTitle from '../lib/useTitle'
import SeasonalOpener, { EventMark } from '../components/SeasonalOpener'

const SAMPLE = 'Thank you for making my year loud, messy and happy. Leave me a wish.'

export function CampaignCard({ campaign, isActive, previewThemeId, setPreviewThemeId }) {
  const [isAnimating, setIsAnimating] = useState(false)
  const previewTheme = previewThemeForCampaign(campaign)
  const eventLabel = occasionOf(campaign.id)?.label || campaign.title
  const isPreviewing = previewThemeId === previewTheme

  return (
    <article className="card flex h-full flex-col bg-white transition-transform hover:-translate-y-0.5">
      {isActive ? (
        <Link to={`/create?campaign=${encodeURIComponent(campaign.id)}`} className="flex flex-1 flex-col">
          <h3 className="text-2xl">{campaign.title}</h3>
          <p className="mt-2 flex-1 text-muted">{campaign.description}</p>
          <span className="link mt-5 inline-block">Create a link</span>
        </Link>
      ) : (
        <div className="flex flex-1 flex-col">
          <h3 className="text-2xl">{campaign.title}</h3>
          <p className="mt-2 flex-1 text-muted">{campaign.description}</p>
          <span className="mt-5 inline-block text-sm font-semibold text-muted">Link creation opens during the event.</span>
        </div>
      )}
      {previewTheme && (campaign.id === 'anniversary' || isActive) && (
        <div className="mt-5 border-t border-ink/15 pt-4">
          <p className="mb-3 text-sm text-muted">Try the {eventLabel} look on this device. It won’t change the event schedule.</p>
          <button
            type="button"
            className={`btn-sun w-full theme-preview-button ${isAnimating ? 'is-toggling' : ''}`}
            aria-label={isPreviewing
              ? `Turn off theme preview for ${eventLabel}`
              : `Preview ${eventLabel} theme`}
            aria-pressed={isPreviewing}
            onClick={() => {
              setPreviewThemeId(isPreviewing ? null : previewTheme)
              setIsAnimating(true)
            }}
            onAnimationEnd={() => setIsAnimating(false)}
          >
            <EventMark theme={previewTheme} className="event-mark" />
            {isPreviewing ? 'Turn off preview' : 'Preview theme'}
          </button>
        </div>
      )}
    </article>
  )
}

function HeroEnvelope({ themeId }) {
  const e = useEnvelope({ max: 3, onStep: (n) => { if (n === 3) fireConfetti({ x: 0.72, y: 0.42, count: 70, power: 0.8 }) } })
  const open = e.step >= 2
  return (
    <div className="relative mx-auto w-full max-w-[480px] pt-20 sm:pt-28">
      {themeId ? (
        <SeasonalOpener
          theme={themeId}
          title="Maria turns 25"
          letterText={SAMPLE}
          step={e.step}
          onActivate={e.open}
          className="seasonal-opener--hero"
        />
      ) : (
        <Envelope3D step={e.step} initial="M" interactive onActivate={e.open} label="Open the sample letter" size="min(80vw, 420px)">
          <div className="t">Maria turns 25</div>
          <p className="body">{SAMPLE}</p>
        </Envelope3D>
      )}
      <div className="mt-12 text-center" aria-live="polite">
        {!themeId && e.step === 0 && !e.busy && <p className="text-lg font-bold">Tap the seal to open it</p>}
        {e.step === 3 && (
          <button type="button" onClick={e.close} className="btn-ghost btn-sm">Close the letter</button>
        )}
        {!themeId && open && e.step < 3 && <p className="text-lg font-bold">Opening</p>}
      </div>
    </div>
  )
}

const STEPS = [
  { t: 'Write the letter', d: 'Your name, your birthday, a few honest paragraphs. Pick the colors of your envelope.' },
  { t: 'Send one link', d: 'Paste it in the group chat, post it, or print its QR code on a card.' },
  { t: 'Unwrap what comes back', d: 'Each wish arrives as a gift box. Open them one by one, or all at once on the day.' },
]

export default function Home() {
  const { themeId, previewThemeId, setPreviewThemeId } = useCampaignTheme()
  useTitle('Batify: birthday letters, wishes and gifts in one link')
  const [boxOpen, setBoxOpen] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [campaignError, setCampaignError] = useState('')

  useEffect(() => {
    let dead = false
    sb.from('campaign_events').select(CAMPAIGN_COLUMNS).eq('is_enabled', true)
      .then(({ data, error }) => {
        if (dead) return
        if (error) setCampaignError('Seasonal links are temporarily unavailable.')
        else setCampaigns((data || []).filter((campaign) =>
          isCampaignActive(campaign) || (campaign.id === 'anniversary' && campaign.is_enabled),
        ))
      })
    return () => { dead = true }
  }, [])

  return (
    <div>
      {/* Hero: the envelope is the product, so it is the first thing you can touch. */}
      <section data-theme={themeId || 'confetti'} className="relative overflow-hidden border-b-2 border-ink bg-ground pb-20">
        <Banderitas className="absolute inset-x-0 top-0" count={11} />
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-24 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:pt-28">
          <div>
            <h1 className="text-balance text-5xl sm:text-6xl lg:text-7xl">Bati na, may pa-gift pa.</h1>
            <p className="mt-5 max-w-lg text-xl leading-snug">
              Write your birthday letter once and share one link. Friends open it like real mail, then send wishes, gifts and a little GCash back.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/create" className="btn-primary px-7 py-3.5 text-lg">Write my letter</Link>
              <Link to="/edit" className="btn-ghost px-7 py-3.5 text-lg">I already have a page</Link>
            </div>
            <p className="mt-4 font-semibold">Free. No account. Takes about three minutes.</p>
          </div>
          <HeroEnvelope themeId={themeId} />
        </div>
      </section>

      {(campaigns.length > 0 || campaignError) && (
        <section className="border-b-2 border-ink bg-sun/30 px-4 py-10 sm:px-6" aria-labelledby="campaigns-h">
          <div className="mx-auto max-w-6xl">
            <h2 id="campaigns-h" className="text-3xl sm:text-4xl">Make a special moment shareable</h2>
            <p className="mt-2 text-muted">Create a link for someone you love and let their people send wishes and gifts.</p>
            {campaignError && <p role="status" className="mt-3 text-sm font-semibold text-flag">{campaignError}</p>}
            <div className={`mt-5 grid gap-3 ${campaigns.length === 1 ? 'sm:max-w-sm sm:grid-cols-1' : campaigns.length === 2 ? 'sm:mx-auto sm:max-w-4xl sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  isActive={isCampaignActive(campaign)}
                  previewThemeId={previewThemeId}
                  setPreviewThemeId={setPreviewThemeId}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="how-h">
        <h2 id="how-h" className="max-w-xl text-4xl sm:text-5xl">From blank page to full inbox in three steps</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="card relative pt-9">
              <span className="absolute -top-5 left-5 grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-sun font-display text-xl font-extrabold">{i + 1}</span>
              <h3 className="text-2xl">{s.t}</h3>
              <p className="mt-2 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y-2 border-ink bg-accent text-white" aria-labelledby="gift-h">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 id="gift-h" className="text-4xl sm:text-5xl">Every wish shows up wrapped</h2>
            <p className="mt-4 max-w-md text-lg text-white/90">
              Friends pick a gift and write a message. You get a box to open, with the photo, the video, or the note inside.
            </p>
            <button type="button" className="btn-sun mt-7" onClick={() => { setBoxOpen((v) => !v); if (!boxOpen) fireConfetti({ x: 0.3, y: 0.55, count: 60, power: 0.7 }) }} aria-pressed={boxOpen}>
              {boxOpen ? 'Wrap it again' : 'Unwrap this one'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {GIFTS.map((g, i) => (
              <div key={g.id} className="rounded-2xl border-2 border-ink bg-white p-3 text-ink">
                <div className="grid h-36 place-items-center">
                  {i === 0 ? <GiftBox3D gift="flower" size={84} open={boxOpen} color={themeId ? undefined : '#E0518B'} ribbon={themeId ? undefined : '#F7C531'} theme={themeId} /> : <GiftArt id={g.id} className="h-24 w-24" />}
                </div>
                <p className="mt-1 text-center text-sm font-bold">{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2" aria-labelledby="lock-h">
        <div className="order-2 rounded-3xl border-2 border-ink bg-ground p-8 lg:order-1" data-theme={themeId || 'confetti'}>
          <FlipCountdown target={Date.now() + 3 * 86400000 + 4 * 3600000 + 12 * 60000 + 30000} />
        </div>
        <div className="order-1 lg:order-2">
          <h2 id="lock-h" className="text-4xl sm:text-5xl">Let the wishes pile up quietly</h2>
          <p className="mt-4 max-w-md text-lg text-muted">
            Set a reveal time, like midnight on your birthday. Friends can send wishes early, and everyone sees a countdown. Nothing is readable until the clock runs out, not even by poking at the server.
          </p>
          <ul className="mt-6 space-y-3 font-semibold">
            <li className="flex items-center gap-3"><Icon name="lock" className="text-accent" />Locked on our servers, not just on screen</li>
            <li className="flex items-center gap-3"><Icon name="eye" className="text-accent" />Review wishes before they appear</li>
            <li className="flex items-center gap-3"><Icon name="qr" className="text-accent" />A QR code for cards and cake toppers</li>
          </ul>
        </div>
      </section>

      <section className="border-t-2 border-ink bg-white" aria-labelledby="faq-h">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 id="faq-h" className="text-4xl sm:text-5xl">Questions</h2>
          <div className="mt-8 divide-y-2 divide-ink/15 border-y-2 border-ink/15">
            {FAQS.map(([q, a]) => (
              <details key={q} className="group py-1">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                  {q}<Icon name="chevron" className="transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 pr-10 text-muted">{a}</p>
              </details>
            ))}
          </div>
          <Link to="/faq" className="link mt-5 inline-flex min-h-11 items-center">See all questions</Link>
        </div>
      </section>

      <section data-theme={themeId || 'confetti'} className="relative overflow-hidden border-t-2 border-ink bg-ground py-20 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-balance text-4xl sm:text-5xl">Your birthday deserves more than a group chat</h2>
          <Link to="/create" className="btn-primary mt-8 px-8 py-4 text-lg">Write my letter</Link>
        </div>
      </section>

      <AdSlot slot={SLOTS.home} />
    </div>
  )
}
