import { Link } from 'react-router-dom'

export default function Logo({ className = 'text-2xl', to = '/' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-1.5 font-brand font-black tracking-tight text-brand-500 ${className}`}>
      <span>batify</span>
      <span aria-hidden="true" className="text-[0.9em]">🎈</span>
    </Link>
  )
}
