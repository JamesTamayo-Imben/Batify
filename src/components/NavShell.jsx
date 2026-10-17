import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'
import InstallHint from './InstallHint'

const ITEMS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/create', label: 'Write', icon: 'pencil' },
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
              <NavLink key={i.to} to={i.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-base font-bold ${isActive ? 'bg-sun' : 'hover:bg-ink/5'}`}>{i.label}</NavLink>
            ))}
            {pathname !== '/create' && <Link to="/create" className="btn-primary btn-sm ml-3">Write a letter</Link>}
          </nav>
        </div>
      </header>

      <main key={pathname} className="min-w-0 flex-1 pb-nav md:pb-0"><Outlet /></main>

      <footer className="hidden border-t-2 border-ink bg-ink py-8 text-sm text-white/80 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <p>Batify. Bati na, may pa-gift pa. No account, ever.</p>
          <p>Your edit link is your key. Keep it somewhere safe.</p>
        </div>
      </footer>

      <InstallHint />

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {ITEMS.map((i) => (
            <li key={i.to}>
              <NavLink to={i.to} end={i.end} className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-bold ${isActive ? 'text-accent' : 'text-muted'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-12 place-items-center rounded-full ${isActive ? 'bg-sun text-ink' : ''}`}><Icon name={i.icon} size={20} /></span>
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
