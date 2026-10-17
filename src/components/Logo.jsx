import { Link } from 'react-router-dom'

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <rect x="2" y="6" width="36" height="28" rx="5" fill="#1F33C7" stroke="#14142B" strokeWidth="2.500" />
      <path d="M4 9.500l16 12 16-12" fill="none" stroke="#fff" strokeWidth="2.500" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="20" cy="22" r="5.200" fill="#F7C531" stroke="#14142B" strokeWidth="2" />
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
