import { Link } from 'react-router-dom'
import useTitle from '../lib/useTitle'

export default function NotFound({ message = "We couldn't find that page." }) {
  useTitle('Not found — Batify')
  return (
    <div className="page-wrap text-center">
      <div className="mb-3 text-6xl" aria-hidden="true">🎈</div>
      <h1 className="text-3xl font-bold">Oops — popped!</h1>
      <p className="mt-2 text-slate-600">{message}</p>
      <Link to="/" className="btn-primary mt-6">Back home</Link>
    </div>
  )
}
