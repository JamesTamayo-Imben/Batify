import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import useTitle from '../lib/useTitle'

const STEPS = [
  {
    title: 'Make it yours',
    description: 'Choose a birthday, anniversary, or available seasonal occasion. Add your name and letter, pick an envelope theme, and set a reveal time if you want to open every wish together.',
  },
  {
    title: 'Share the good news',
    description: 'Send friends the public page link or download its QR code for a card, cake topper, or gift box. Your private edit link is just for you, so tuck it somewhere safe.',
  },
  {
    title: 'Unwrap the wishes',
    description: 'Friends leave a note and choose a virtual gift theme. Review wishes before they appear or let them arrive automatically, then unwrap them one by one or all at once.',
  },
]

export default function HowItWorks() {
  useTitle('How Batify works')

  return (
    <div>
      <section className="border-b-2 border-ink bg-accent px-4 py-16 text-white sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <h1 className="max-w-3xl text-5xl sm:text-6xl">Write once. Share the moment.</h1>
            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/90">
              Turn a birthday or special-occasion letter into one cheerful page your people can visit to send their wishes.
            </p>
          </div>
          <Link to="/create" className="btn-sun w-fit">Create your page</Link>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="steps-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="steps-heading" className="max-w-2xl text-4xl sm:text-5xl">Three little steps. One lovely surprise.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-2 border-ink pt-5">
                <span className="inline-grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-sun font-display text-xl font-extrabold" aria-label={`Step ${index + 1}`}>
                  {index + 1}
                </span>
                <h3 className="mt-5 text-2xl">{step.title}</h3>
                <p className="mt-3 text-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y-2 border-ink bg-ground/40 px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="details-heading">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 id="details-heading" className="text-4xl sm:text-5xl">A few useful details.</h2>
            <p className="mt-4 max-w-md text-lg text-muted">You stay in control of your page and what happens to the wishes.</p>
          </div>
          <div className="divide-y-2 divide-ink/15 border-y-2 border-ink/15">
            <article className="py-5">
              <h3 className="flex items-center gap-2 text-xl"><Icon name="lock" size={20} />Set the moment</h3>
              <p className="mt-2 text-muted">Choose when wishes should appear, and decide whether to approve them first. The countdown makes the wait part of the fun.</p>
            </article>
            <article className="py-5">
              <h3 className="flex items-center gap-2 text-xl"><Icon name="gift" size={20} />Virtual gifts, real thought</h3>
              <p className="mt-2 text-muted">Friends can pick flowers, a teddy bear, chocolate, cake, coffee, a book, balloons, or a photo/video to go with their note. They are playful tokens of appreciation, not physical deliveries.</p>
            </article>
            <article className="py-5">
              <h3 className="flex items-center gap-2 text-xl"><Icon name="key" size={20} />Your edit link is private</h3>
              <p className="mt-2 text-muted">Anyone with the edit link can manage your page. Share the public page link with friends instead, and save the edit link somewhere safe.</p>
            </article>
            <article className="py-5">
              <h3 className="text-xl">A little extra, if you want</h3>
              <p className="mt-2 text-muted">You can add GCash details, but it is completely optional. Friends send money in their own GCash app; Batify never handles the payment.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="mx-auto max-w-2xl text-4xl sm:text-5xl">Ready to make your page?</h2>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/create" className="btn-primary">Write a letter</Link>
          <Link to="/faq" className="btn-ghost">Read the questions</Link>
        </div>
      </section>
    </div>
  )
}
