import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Logo from './Logo'
import InstallHint from './InstallHint'

const ITEMS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/create', label: 'Create', icon: '✨' },
  { to: '/edit', label: 'My page', icon: '🔑' },
]

const linkBase = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition'

export default function NavShell() {
  const { pathname } = useLocation()
  // The dashboard + admin stay quiet; everything else gets the nav.
  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <Logo className="mb-8 text-3xl" />
        <nav className="flex flex-col gap-1" aria-label="Main">
          {ITEMS.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? 'bg-brand-100 text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`
              }
            >
              <span aria-hidden="true">{i.icon}</span>
              {i.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto text-xs leading-relaxed text-slate-400">
          Bati na, may pa-gift pa.
          <br />
          No account. Ever.
        </p>
      </aside>

      <main key={pathname} className="min-w-0 flex-1 pb-nav md:pb-0">
        <Outlet />
      </main>

      <InstallHint />

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {ITEMS.map((i) => (
            <li key={i.to}>
              <NavLink
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                    isActive ? 'text-brand-600' : 'text-slate-500'
                  }`
                }
              >
                <span className="text-xl" aria-hidden="true">{i.icon}</span>
                {i.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
