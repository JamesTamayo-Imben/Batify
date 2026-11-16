import { Link } from 'react-router-dom'

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <rect x="2" y="6" width="36" height="28" rx="5" fill="#1F33C7" stroke="#14142B" strokeWidth="2.5" />
      <path d="M4.5 10 20 21.5 35.5 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="16.5" cy="24" r="1.5" fill="#F7C531" />
      <circle cx="23.5" cy="24" r="1.5" fill="#F7C531" />
      <path className="logo-smile" d="M13 26.5c2.6 4.5 11.4 4.5 14 0" fill="none" stroke="#F7C531" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ className = 'text-2xl', to = '/' }) {
  return (
    <Link to={to} aria-label="Batify home" className={`inline-flex items-center gap-2 font-display font-extrabold tracking-tight text-ink ${className}`}>
      <LogoMark size={34} />
      <span>batify</span>
    </Link>
  )
}
