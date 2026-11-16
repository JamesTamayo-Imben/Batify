import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import useTitle from '../lib/useTitle'

const EMAIL = 'jamesttamayo0604@gmail.com'
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent('A note about Batify')}`

export default function Contact() {
  useTitle('Contact Batify')

  return (
    <div>
      <section className="border-b-2 border-ink bg-ground px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl text-5xl sm:text-6xl">Questions, ideas, or just a hello?</h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed">
            Whether you need a hand, spotted something we could improve, or have an idea to share, Jimz would be glad to hear from you.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="max-w-md text-4xl sm:text-5xl">Drop a note in the inbox.</h2>
          <div className="max-w-2xl space-y-5">
            <a href={MAILTO} className="btn-primary w-fit">
              <Icon name="mail" size={20} />
              Email Jimz
            </a>
            <p className="text-lg text-muted">
              Prefer to copy the address? Reach Jimz at <a className="link break-all" href={MAILTO}>{EMAIL}</a>.
            </p>
            <p className="text-muted">The button opens a new message in your email app, so you can review it before sending.</p>
            <p className="text-muted">
              Looking for a quick answer first? Browse the <Link to="/faq" className="link">frequently asked questions</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-ink bg-white px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl">Every good idea starts with a note.</h2>
            <p className="mt-3 max-w-xl text-muted">Get to know the story and the person behind Batify.</p>
          </div>
          <Link to="/about-developer" className="btn-ghost">Read the developer’s story</Link>
        </div>
      </section>
    </div>
  )
}
