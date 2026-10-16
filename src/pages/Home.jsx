import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import Logo from '../components/Logo'
import { SLOTS } from '../lib/ads'

const FEATURES = [
  { icon: '💌', title: 'One letter, one link', body: 'Write your birthday letter, get a page you can share anywhere. No signup, no password.' },
  { icon: '⏳', title: 'Wishes that wait', body: 'Lock wishes until your birthday. Watch the countdown, then open them all at once.' },
  { icon: '🎁', title: 'Gifts that stay', body: 'Friends send flowers, a teddy, chocolate, a photo or video — or a little GCash.' },
]

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-100 via-brand-50 to-transparent px-4 pb-14 pt-10 text-center sm:pt-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none text-2xl opacity-60">
          <span className="absolute left-[8%] top-10 animate-float">🎈</span>
          <span className="absolute right-[10%] top-24 animate-float [animation-delay:1s]">🎉</span>
          <span className="absolute left-[16%] top-48 animate-float [animation-delay:2s]">✨</span>
          <span className="absolute right-[18%] top-6 animate-float [animation-delay:3s]">🎂</span>
        </div>
        <div className="relative mx-auto max-w-2xl">
          <div className="md:hidden"><Logo className="mb-4 text-3xl" /></div>
          <div className="mx-auto mb-5 hidden h-20 w-20 animate-pop items-center justify-center rounded-3xl bg-white text-5xl shadow-sm md:flex">🎈</div>
          <h1 className="animate-fade-up text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            Send a greeting that stays.
          </h1>
          <p className="mt-2 font-display text-lg italic text-brand-600">Bati na, may pa-gift pa.</p>
          <p className="mx-auto mt-4 max-w-md text-base text-slate-600">
            Birthday letters, wishes &amp; gifts — one link, no signup.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/create" className="btn-primary px-7 py-3.5 text-base">Create a birthday page</Link>
            <Link to="/edit" className="btn-ghost px-7 py-3.5 text-base">I have one</Link>
          </div>
        </div>
      </section>

      <section className="page-wrap pt-2">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card text-center sm:text-left">
              <div className="mb-2 text-3xl" aria-hidden="true">{f.icon}</div>
              <h2 className="text-lg font-bold">{f.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <AdSlot slot={SLOTS.home} />
    </div>
  )
}
