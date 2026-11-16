import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import useTitle from '../lib/useTitle'

export default function AboutDeveloper() {
  useTitle('About the developer')

  return (
    <div>
      <section className="border-b-2 border-ink bg-ground px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <h1 className="max-w-3xl text-5xl sm:text-6xl">Meet Jimz, the maker of Batify.</h1>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed">
              I wanted to make a celebration feel special, even when there isn’t a wrapped present or extra money to give.
            </p>
          </div>
          <div className="flex items-center gap-4 border-t-2 border-ink pt-5 md:justify-end md:border-l-2 md:border-t-0 md:pl-8 md:pt-0">
            <LogoMark size={52} />
            <p className="max-w-xs font-display text-2xl font-bold">A little note can go a long way.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="origin-heading">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 id="origin-heading" className="max-w-md text-4xl sm:text-5xl">A small idea, made to be shared.</h2>
          <div className="max-w-2xl space-y-5 text-lg leading-relaxed text-muted">
            <p>
              The idea came to me as Christmas was getting closer. I wanted a way to make the season feel lively and bring people together, even if nobody had a wrapped present or extra money to share.
            </p>
            <p>
              A thoughtful message can be its own little gift. I imagined a place where someone could write a letter, share one link, and let friends send kind words with virtual gifts that make opening each wish part of the fun.
            </p>
            <p>
              That idea became Batify: a playful way to celebrate and remind someone they matter. There is no spending required. The appreciation is the real gift.
            </p>
            <p className="font-bold text-ink">— Jimz, developer of Batify</p>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-ink bg-white px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl">Make a moment someone can open.</h2>
            <p className="mt-3 max-w-xl text-muted">Write a letter, share the link, and let the people around you send a little appreciation.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/create" className="btn-primary">Write a letter</Link>
            <Link to="/contact" className="btn-ghost">Contact Jimz</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
