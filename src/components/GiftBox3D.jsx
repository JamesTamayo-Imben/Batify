import { giftColors } from '../lib/gifts'

function Bow() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path d="M30 32C18 14 6 22 10 34c4 10 18 2 20-2zM30 32c12-18 24-10 20 2-4 10-18 2-20-2z" fill="var(--gb-ribbon)" stroke="#14142B" strokeWidth="2.500" strokeLinejoin="round" />
      <circle cx="30" cy="32" r="6" fill="var(--gb-ribbon)" stroke="#14142B" strokeWidth="2.500" />
    </svg>
  )
}

/** Real 3D gift box. `open` swings the lid back on its hinge. */
export default function GiftBox3D({ gift = 'flower', open = false, size = 96, live = false, className = '', color, ribbon }) {
  const g = giftColors(gift)
  const style = { '--b': `${size}px`, '--gb-color': color || g.color, '--gb-color2': color || g.color, '--gb-ribbon': ribbon || g.ribbon }
  return (
    <div className={`gb ${open ? 'is-open' : ''} ${live ? 'is-live' : ''} ${className}`} style={style} aria-hidden="true">
      <div className="gb-shadow" />
      <div className="gb-rig">
        <div className="gb-body">
          <div className="f front" /><div className="f back" /><div className="f left" /><div className="f right" /><div className="f bottom" /><div className="f well" />
        </div>
        <div className="gb-lidpivot">
          <div className="gb-lid">
            <div className="f front" /><div className="f back" /><div className="f left" /><div className="f right" />
            <div className="f top"><Bow /></div><div className="f under" />
          </div>
        </div>
      </div>
    </div>
  )
}
