// Flat sticker illustrations for the four gift types. 120x120, ink outlines.
const INK = '#14142B'
const S = { stroke: INK, strokeWidth: 2.500, strokeLinejoin: 'round', strokeLinecap: 'round' }

function Bloom({ cx, cy, r, color, center = '#F7C531' }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy={-r * 0.85} rx={r * 0.55} ry={r * 0.78} fill={color} {...S} strokeWidth="2" transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.42} fill={center} {...S} strokeWidth="2" />
    </g>
  )
}

export function FlowerArt() {
  return (
    <svg viewBox="0 0 120 120">
      <path d="M60 72L38 42M60 72V30M60 72l22-30" stroke="#2E8B57" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M45 58c-8-2-12 2-14 6 7 2 12 0 14-6zM75 58c8-2 12 2 14 6-7 2-12 0-14-6z" fill="#3FAE6B" {...S} strokeWidth="2" />
      <Bloom cx={38} cy={38} r={13} color="#E0518B" />
      <Bloom cx={60} cy={26} r={14} color="#F7C531" center="#C92F20" />
      <Bloom cx={82} cy={38} r={13} color="#9B7BEA" />
      <path d="M26 62L94 62L68 112H52Z" fill="#FFF7DC" {...S} />
      <path d="M33 74L87 74M40 88L80 88" stroke="#C92F20" strokeWidth="2.500" strokeLinecap="round" opacity=".9" />
      <path d="M52 112L60 98L68 112" fill="#C92F20" {...S} strokeWidth="2" />
    </svg>
  )
}

export function TeddyArt() {
  return (
    <svg viewBox="0 0 120 120">
      <circle cx="36" cy="28" r="11" fill="#B8793E" {...S} /><circle cx="36" cy="28" r="5" fill="#F2C48D" />
      <circle cx="84" cy="28" r="11" fill="#B8793E" {...S} /><circle cx="84" cy="28" r="5" fill="#F2C48D" />
      <ellipse cx="60" cy="96" rx="27" ry="21" fill="#B8793E" {...S} />
      <ellipse cx="60" cy="98" rx="14" ry="12" fill="#F2C48D" />
      <circle cx="32" cy="88" r="9" fill="#B8793E" {...S} /><circle cx="88" cy="88" r="9" fill="#B8793E" {...S} />
      <circle cx="42" cy="112" r="9" fill="#B8793E" {...S} /><circle cx="78" cy="112" r="9" fill="#B8793E" {...S} />
      <circle cx="60" cy="52" r="29" fill="#B8793E" {...S} />
      <ellipse cx="60" cy="63" rx="14" ry="11" fill="#F2C48D" {...S} strokeWidth="2" />
      <circle cx="48" cy="46" r="3.200" fill={INK} /><circle cx="72" cy="46" r="3.200" fill={INK} />
      <path d="M55 59h10l-5 5z" fill={INK} {...S} strokeWidth="1.500" /><path d="M60 64v4M54 69c3 3 9 3 12 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M46 80l14 6 14-6v10l-14-4-14 4z" fill="#C92F20" {...S} strokeWidth="2" /><circle cx="60" cy="84" r="4" fill="#C92F20" {...S} strokeWidth="2" />
    </svg>
  )
}

export function ChocolateArt() {
  return (
    <svg viewBox="0 0 120 120">
      <g transform="rotate(-8 60 66)">
        <rect x="28" y="26" width="64" height="86" rx="6" fill="#C92F20" {...S} />
        <rect x="28" y="64" width="64" height="20" fill="#F7C531" stroke={INK} strokeWidth="2.500" />
        <path d="M44 74h32" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M28 26l8-14h48l8 14" fill="#5B3426" {...S} />
        <path d="M36 12v14M52 12v14M68 12v14M84 12v14" stroke="#8A5640" strokeWidth="2.500" />
        <path d="M28 26h64" stroke={INK} strokeWidth="2.500" />
        <path d="M36 100h48" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      </g>
    </svg>
  )
}

export function PhotoArt() {
  return (
    <svg viewBox="0 0 120 120">
      <g transform="rotate(6 60 62)">
        <rect x="16" y="14" width="88" height="96" rx="5" fill="#fff" {...S} />
        <rect x="24" y="22" width="72" height="62" rx="2" fill="#7FC8F8" {...S} strokeWidth="2" />
        <circle cx="76" cy="38" r="9" fill="#F7C531" {...S} strokeWidth="2" />
        <path d="M24 84V66l20-18 18 16 12-8 22 20v8z" fill="#3FAE6B" {...S} strokeWidth="2" />
        <path d="M32 98h40" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M32 105h24" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity=".5" />
        <circle cx="88" cy="96" r="11" fill="#C92F20" {...S} strokeWidth="2.200" /><path d="M85 91l8 5-8 5z" fill="#fff" />
      </g>
    </svg>
  )
}

const MAP = { flower: FlowerArt, teddy: TeddyArt, chocolate: ChocolateArt, media: PhotoArt }

export default function GiftArt({ id, className = '', label }) {
  const Art = MAP[id] || FlowerArt
  return (
    <span className={`block ${className}`} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <Art />
    </span>
  )
}
