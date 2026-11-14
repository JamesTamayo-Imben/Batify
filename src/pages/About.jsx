import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import useTitle from '../lib/useTitle'

export default function About() {
  useTitle('About Batify')

  return (
    <div>
      <section data-theme="confetti" className="border-b-2 border-ink bg-ground px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <h1 className="max-w-3xl text-5xl sm:text-6xl">A birthday letter, ready to share.</h1>
              <p className="mt-6 max-w-2xl text-xl leading-relaxed">
                Batify brings your letter, a shareable page, and the wishes from your people together in one link.
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
          <h2 className="max-w-md text-4xl sm:text-5xl">One link for the words and the wishes.</h2>
          <div className="max-w-2xl space-y-5 text-lg leading-relaxed text-muted">
            <p>
              Write a birthday letter, choose its look, and share the page with friends and family. They can leave a message with a gift theme, and you can open the wishes when you are ready.
            </p>
            <p>
              There are no user accounts. Your private edit link is the key to your page, so save it somewhere safe and share only the public page link.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-ink bg-white px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="about-principles">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <h2 id="about-principles" className="text-3xl sm:col-span-3">Made for a small, meaningful ritual.</h2>
          <article className="border-t-2 border-ink pt-4">
            <h3 className="text-2xl">Write it your way</h3>
            <p className="mt-3 text-muted">Add your own letter, choose an envelope theme, and set a reveal time for wishes if you want to open them together.</p>
          </article>
          <article className="border-t-2 border-ink pt-4">
            <h3 className="text-2xl">Share one page</h3>
            <p className="mt-3 text-muted">Send the link in a group chat or use the page’s QR code on a card or cake topper.</p>
          </article>
          <article className="border-t-2 border-ink pt-4">
            <h3 className="text-2xl">Keep the edit link safe</h3>
            <p className="mt-3 text-muted">The private edit link lets you manage your page. Friends only need the public link to send wishes.</p>
          </article>
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="mx-auto max-w-2xl text-4xl sm:text-5xl">Start with a letter.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Make a page, then share it with the people you want to hear from.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/create" className="btn-primary">Write a letter</Link>
          <Link to="/how-it-works" className="btn-ghost">See how it works</Link>
        </div>
      </section>
    </div>
  )
}
