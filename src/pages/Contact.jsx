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
          <h1 className="max-w-3xl text-5xl sm:text-6xl">Have a question? Say hello.</h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed">
            Questions, ideas, or feedback about Batify are welcome. Send Jimz a note and it will open in your email app.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="max-w-md text-4xl sm:text-5xl">The best way to reach me.</h2>
          <div className="max-w-2xl space-y-5">
            <a href={MAILTO} className="btn-primary w-fit">
              <Icon name="mail" size={20} />
              Email Jimz
            </a>
            <p className="text-lg text-muted">
              Or write directly to <a className="link break-all" href={MAILTO}>{EMAIL}</a>.
            </p>
            <p className="text-muted">
              Looking for a quick answer? The <Link to="/faq" className="link">questions page</Link> may help.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-ink bg-white px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl">A note can be a gift.</h2>
            <p className="mt-3 max-w-xl text-muted">Learn why Batify was made for fun, connection, and virtual appreciation.</p>
          </div>
          <Link to="/about-developer" className="btn-ghost">Read the developer’s story</Link>
        </div>
      </section>
    </div>
  )
}
