import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import InstallHint from './InstallHint'

const ITEMS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/create', label: 'Write', desktopLabel: 'Write a letter', icon: 'pencil' },
  { to: '/edit', label: 'My page', icon: 'key' },
]

export default function NavShell() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 pt-safe backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo className="text-2xl" />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {ITEMS.slice(1).map((i) => (
              <NavLink key={i.to} to={i.to} className={({ isActive }) => `whitespace-nowrap rounded-lg border-2 px-3 py-2 text-base font-bold transition-colors ${isActive ? 'border-ink bg-sun text-ink shadow-[0_2px_0_0_rgb(var(--ink))]' : 'border-transparent hover:bg-ink/5'}`}>{i.desktopLabel || i.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main key={pathname} className="min-w-0 flex-1 pb-nav md:pb-0"><Outlet /></main>

      <footer className="border-t-2 border-ink bg-ink text-sm text-white/80">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 px-4 py-10 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:grid-cols-4 md:pb-10">
          <div className="col-span-2 md:col-span-1">
            <Logo className="!text-white text-2xl" />
            <p className="mt-4 max-w-xs leading-relaxed">Birthday letters, wishes, and gifts in one link.</p>
          </div>
          <nav aria-label="Create and manage">
            <h2 className="font-bold text-white">Make a page</h2>
            <ul className="mt-3 space-y-1">
              <li><Link className="flex min-h-11 items-center hover:text-sun focus-visible:outline-sun" to="/create">Write a letter</Link></li>
              <li><Link className="flex min-h-11 items-center hover:text-sun focus-visible:outline-sun" to="/edit">Open my page</Link></li>
            </ul>
          </nav>
          <nav aria-label="Learn about Batify">
            <h2 className="font-bold text-white">Learn</h2>
            <ul className="mt-3 space-y-1">
              <li><Link className="flex min-h-11 items-center hover:text-sun focus-visible:outline-sun" to="/how-it-works">How it works</Link></li>
              <li><Link className="flex min-h-11 items-center hover:text-sun focus-visible:outline-sun" to="/faq">Questions</Link></li>
              <li><Link className="flex min-h-11 items-center hover:text-sun focus-visible:outline-sun" to="/about">About Batify</Link></li>
              <li><Link className="flex min-h-11 items-center hover:text-sun focus-visible:outline-sun" to="/about-developer">About the developer</Link></li>
              <li><Link className="flex min-h-11 items-center hover:text-sun focus-visible:outline-sun" to="/contact">Contact us</Link></li>
            </ul>
          </nav>
          <div className="col-span-2 border-t border-white/20 pt-5 md:col-span-1 md:border-0 md:pt-0">
            <p className="font-bold text-white">Keep your edit link safe.</p>
            <p className="mt-2 leading-relaxed">Anyone with that private link can manage your page. Share the public page link with friends.</p>
            <Link to="/how-it-works" className="mt-3 inline-flex min-h-11 items-center font-bold text-sun underline underline-offset-4 hover:text-white focus-visible:outline-sun">Learn how it works</Link>
          </div>
          <div className="col-span-2 flex flex-col gap-2 border-t border-white/20 pt-5 text-xs sm:flex-row sm:items-center sm:justify-between md:col-span-4">
            <p>Batify · Bati na, may pa-gift pa.</p>
            <Link to="/" className="min-h-11 inline-flex items-center hover:text-sun focus-visible:outline-sun">Back to home</Link>
          </div>
        </div>
      </footer>

      <InstallHint />

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {ITEMS.map((i) => (
            <li key={i.to}>
              <NavLink to={i.to} end={i.end} className={({ isActive }) => `mx-1 my-1 flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 text-xs font-bold transition-colors ${isActive ? 'border-ink bg-sun text-ink shadow-[0_2px_0_0_rgb(var(--ink))]' : 'border-transparent text-muted hover:bg-ink/5'}`}>
                {({ isActive }) => (
                  <>
                    <span className="grid h-7 w-12 place-items-center rounded-full"><Icon name={i.icon} size={20} /></span>
                    {i.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
