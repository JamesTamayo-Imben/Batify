import { giftColors } from '../lib/gifts'

const EVENT_BOXES = {
  christmas: { color: '#176B45', ribbon: '#F7C531' },
  halloween: { color: '#6A3F86', ribbon: '#F28C28' },
  valentines: { color: '#C92F52', ribbon: '#FFE5E8' },
  new_year: { color: '#174970', ribbon: '#F7C531' },
  anniversary: { color: '#C98B57', ribbon: '#F7D983' },
}

function Bow() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path d="M30 32C18 14 6 22 10 34c4 10 18 2 20-2zM30 32c12-18 24-10 20 2-4 10-18 2-20-2z" fill="var(--gb-ribbon)" stroke="#14142B" strokeWidth="2.500" strokeLinejoin="round" />
      <circle cx="30" cy="32" r="6" fill="var(--gb-ribbon)" stroke="#14142B" strokeWidth="2.500" />
    </svg>
  )
}

/** Real 3D gift box. `open` swings the lid back on its hinge. */
export default function GiftBox3D({ gift = 'flower', open = false, size = 96, live = false, className = '', color, ribbon, theme }) {
  const g = giftColors(gift)
  const eventBox = EVENT_BOXES[theme]
  const boxColor = color || eventBox?.color || g.color
  const style = { '--b': `${size}px`, '--gb-color': boxColor, '--gb-color2': boxColor, '--gb-ribbon': ribbon || eventBox?.ribbon || g.ribbon }
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
