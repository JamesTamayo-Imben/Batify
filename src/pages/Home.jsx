import { useState } from 'react'
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
import useTitle from '../lib/useTitle'

const SAMPLE = 'Thank you for making my year loud, messy and happy. Leave me a wish.'

function HeroEnvelope() {
  const e = useEnvelope({ max: 3, onStep: (n) => { if (n === 3) fireConfetti({ x: 0.72, y: 0.42, count: 70, power: 0.8 }) } })
  const open = e.step >= 2
  return (
    <div className="relative mx-auto w-full max-w-[480px] pt-20 sm:pt-28">
      <Envelope3D step={e.step} initial="M" interactive onActivate={e.open} label="Open the sample letter" size="min(80vw, 420px)">
        <div className="t">Maria turns 25</div>
        <p className="body">{SAMPLE}</p>
      </Envelope3D>
      <div className="mt-12 text-center" aria-live="polite">
        {e.step === 0 && !e.busy && <p className="text-lg font-bold">Tap the seal to open it</p>}
        {e.step === 3 && (
          <button type="button" onClick={e.close} className="btn-ghost btn-sm">Close the letter</button>
        )}
        {open && e.step < 3 && <p className="text-lg font-bold">Opening</p>}
      </div>
    </div>
  )
}

const STEPS = [
  { t: 'Write the letter', d: 'Your name, your birthday, a few honest paragraphs. Pick the colors of your envelope.' },
  { t: 'Send one link', d: 'Paste it in the group chat, post it, or print its QR code on a card.' },
  { t: 'Unwrap what comes back', d: 'Each wish arrives as a gift box. Open them one by one, or all at once on the day.' },
]

const FAQ = [
  ['Is it free?', 'Yes. Pages, wishes and gifts cost nothing. Pages may show a single ad at the very bottom, never next to a form or a photo.'],
  ['Do I need an account?', 'No. When you create a page you get a private edit link. Anyone with that link can manage the page, so keep it safe.'],
  ['What if I lose my edit link?', 'It cannot be recovered. Save it to your notes or message it to yourself right after you create the page.'],
  ['Can I hide wishes until my birthday?', 'Yes. Set a reveal time and everyone sees a countdown. Wishes stay hidden on our servers until then, not just on screen.'],
  ['How does GCash work?', 'Add your number. Friends send money in the GCash app and upload a screenshot here. You check each one and mark it as received. Batify never touches the money.'],
  ['What can friends send?', 'Flowers, a teddy bear, chocolate, or a photo or video up to 25 MB, plus a message. You can review wishes before they appear.'],
]

export default function Home() {
  useTitle('Batify: birthday letters, wishes and gifts in one link')
  const [boxOpen, setBoxOpen] = useState(false)
  return (
    <div>
      {/* Hero: the envelope is the product, so it is the first thing you can touch. */}
      <section data-theme="confetti" className="relative overflow-hidden border-b-2 border-ink bg-ground pb-20">
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
          <HeroEnvelope />
        </div>
      </section>

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
                <div className="grid h-28 place-items-center">
                  {i === 0 ? <GiftBox3D gift="flower" size={84} open={boxOpen} color="#E0518B" ribbon="#F7C531" /> : <GiftArt id={g.id} className="h-24 w-24" />}
                </div>
                <p className="mt-1 text-center text-sm font-bold">{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2" aria-labelledby="lock-h">
        <div className="order-2 rounded-3xl border-2 border-ink bg-ground p-8 lg:order-1" data-theme="confetti">
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
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-1">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                  {q}<Icon name="chevron" className="transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 pr-10 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section data-theme="confetti" className="relative overflow-hidden border-t-2 border-ink bg-ground py-20 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-balance text-4xl sm:text-5xl">Your birthday deserves more than a group chat</h2>
          <Link to="/create" className="btn-primary mt-8 px-8 py-4 text-lg">Write my letter</Link>
        </div>
      </section>

      <AdSlot slot={SLOTS.home} />
    </div>
  )
}
