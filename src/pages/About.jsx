import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import useTitle from '../lib/useTitle'

export default function About() {
  useTitle('About Batify')

  return (
    <div>
      <section className="border-b-2 border-ink bg-ground px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <h1 className="max-w-3xl text-5xl sm:text-6xl">A little love, wrapped in one link.</h1>
              <p className="mt-6 max-w-2xl text-xl leading-relaxed">
                Batify makes it easy to send a personal letter and gather the people who want to celebrate you—wherever they are.
              </p>
            </div>
            <div className="flex items-center gap-4 border-t-2 border-ink pt-5 md:justify-end md:border-l-2 md:border-t-0 md:pl-8 md:pt-0">
              <LogoMark size={52} />
              <p className="max-w-xs font-display text-2xl font-bold">Bati na, may pa-gift pa.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="max-w-md text-4xl sm:text-5xl">A celebration should feel close, even from far away.</h2>
          <div className="max-w-2xl space-y-5 text-lg leading-relaxed text-muted">
            <p>
              Make a page for a birthday, anniversary, or seasonal celebration. Add a letter, choose its look, then share one link with friends and family so they can send a note and a virtual gift.
            </p>
            <p>
              Wishes can arrive right away or stay sealed until your chosen reveal. There is no account to set up, and no real gift or payment is needed—the kind words are the good stuff.
            </p>
            <p>
              Batify is built for a playful moment of appreciation, not a shopping list. Virtual gifts add a little theater to each message; they do not represent physical items or deliveries.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-ink bg-white px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="about-principles">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <h2 id="about-principles" className="text-3xl sm:col-span-3">Made for a small, meaningful ritual.</h2>
          <article className="border-t-2 border-ink pt-4">
            <h3 className="text-2xl">Write it your way</h3>
            <p className="mt-3 text-muted">Add your own letter, pick an envelope theme, and choose when the wishes should be revealed.</p>
          </article>
          <article className="border-t-2 border-ink pt-4">
            <h3 className="text-2xl">Share one page</h3>
            <p className="mt-3 text-muted">Send the public link in a group chat or print its QR code on a card or cake topper.</p>
          </article>
          <article className="border-t-2 border-ink pt-4">
            <h3 className="text-2xl">Keep the edit link safe</h3>
            <p className="mt-3 text-muted">Keep your edit link private and share the public one. That way, friends can join the celebration without getting the keys to your page.</p>
          </article>
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="mx-auto max-w-2xl text-4xl sm:text-5xl">The best part is hearing from your people.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Write a few heartfelt words, share your page, and let the happy notes roll in.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/create" className="btn-primary">Write a letter</Link>
          <Link to="/how-it-works" className="btn-ghost">See how it works</Link>
        </div>
      </section>
    </div>
  )
}
