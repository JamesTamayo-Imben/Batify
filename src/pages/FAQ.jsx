import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import useTitle from '../lib/useTitle'
import { FAQS } from '../lib/faqs'

export default function FAQ() {
  useTitle('Questions and answers')

  return (
    <div>
      <section className="border-b-2 border-ink bg-ground px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl text-5xl sm:text-6xl">Questions, answered.</h1>
          <p className="mt-5 max-w-2xl text-xl text-ink/80">The details on creating a page, sharing it, and keeping your edit link safe.</p>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="faq-list-heading">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq-list-heading" className="sr-only">Frequently asked questions</h2>
          <div className="divide-y-2 divide-ink/15 border-y-2 border-ink/15">
            {FAQS.map(([question, answer]) => (
              <details key={question} className="group py-1">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-bold">
                  {question}
                  <Icon name="chevron" className="shrink-0 text-accent transition-transform group-open:rotate-180" />
                </summary>
                <p className="max-w-2xl pb-5 pr-8 leading-relaxed text-muted">{answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 border-t-2 border-ink pt-6">
            <p className="text-muted">Still deciding? You can start a page and save its private edit link before sharing it.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link to="/create" className="btn-primary">Write a letter</Link>
              <Link to="/how-it-works" className="btn-ghost">How it works</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
