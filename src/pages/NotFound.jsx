import { Link } from 'react-router-dom'
import useTitle from '../lib/useTitle'
import Envelope3D from '../components/Envelope3D'

export default function NotFound({ message = "We couldn't find that page." }) {
  useTitle('Not found - Batify')
  return (
    <div className="page-wrap text-center">
      <div data-theme="confetti" className="mb-10 mt-24 grid place-items-center">
        <Envelope3D step={2} initial="?" still size="min(70vw, 280px)"><div className="t">Nothing inside</div></Envelope3D>
      </div>
      <h1 className="text-4xl">This envelope is empty</h1>
      <p className="mx-auto mt-3 max-w-md text-lg text-muted">{message}</p>
      <Link to="/" className="btn-primary mt-7">Back to Batify</Link>
    </div>
  )
}
