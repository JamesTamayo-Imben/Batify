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

export function CakeArt() {
  return (
    <svg viewBox="0 0 120 120">
      <ellipse cx="60" cy="105" rx="39" ry="8" fill="#FFF7DC" {...S} />
      <path d="M30 60h60v34c0 7-6 12-13 12H43c-7 0-13-5-13-12z" fill="#F2C48D" {...S} />
      <path d="M30 61c8 0 8 8 15 8s7-8 15-8 8 8 15 8 7-8 15-8V49H30z" fill="#FFF7DC" {...S} />
      <path d="M40 49V29h9v20M56 49V23h9v26M72 49V29h9v20" fill="#E0518B" {...S} />
      <path d="M44.5 26c-5-6 5-7 0-13M60.5 20c-5-6 5-7 0-13M76.5 26c-5-6 5-7 0-13" fill="none" stroke="#F7C531" strokeWidth="3" strokeLinecap="round" />
      <path d="M42 84h36" stroke="#C92F20" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function CoffeeArt() {
  return (
    <svg viewBox="0 0 120 120">
      <path d="M36 29c-8-8 8-10 0-18M60 29c-8-8 8-10 0-18M84 29c-8-8 8-10 0-18" fill="none" stroke="#7A4934" strokeWidth="3" strokeLinecap="round" />
      <path d="M27 38h58v47c0 10-8 18-18 18H45c-10 0-18-8-18-18z" fill="#FFF7DC" {...S} />
      <path d="M85 49h8c12 0 12 23 0 23h-8" fill="none" stroke={INK} strokeWidth="5" />
      <path d="M31 49h50" stroke="#7A4934" strokeWidth="8" strokeLinecap="round" />
      <path d="M48 69c5-8 17-8 22 0-1 8-7 12-11 13-4-1-10-5-11-13z" fill="#E0518B" />
      <path d="M60 76v12" stroke="#C92F20" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 108h36" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function BookArt() {
  return (
    <svg viewBox="0 0 120 120">
      <g transform="rotate(-7 60 62)">
        <rect x="28" y="13" width="64" height="96" rx="5" fill="#1F33C7" {...S} />
        <path d="M39 14v94" stroke="#F7C531" strokeWidth="4" />
        <path d="M50 40c7-6 15-6 22 0v30c-7-6-15-6-22 0zM72 40c7-6 15-6 22 0v30c-7-6-15-6-22 0z" fill="#FFF7DC" {...S} strokeWidth="2" />
        <path d="M58 48h8M58 56h8M80 48h8M80 56h8" stroke="#C92F20" strokeWidth="2" strokeLinecap="round" />
        <path d="M53 88h38" stroke="#F7C531" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function BalloonArt() {
  return (
    <svg viewBox="0 0 120 120">
      <ellipse cx="39" cy="39" rx="20" ry="26" fill="#E0518B" {...S} />
      <ellipse cx="78" cy="34" rx="19" ry="25" fill="#9B7BEA" {...S} />
      <ellipse cx="61" cy="66" rx="22" ry="28" fill="#F7C531" {...S} />
      <path d="M39 65c4 13 13 25 12 43M78 59c-2 17-10 31-13 49M61 94v14" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M35 64l4 5 4-5M74 58l4 5 4-5M57 93l4 5 4-5" fill="#C92F20" {...S} strokeWidth="1.5" />
      <path d="M28 31c2-7 6-10 12-12M70 27c2-7 7-10 13-11M52 56c3-8 8-11 14-12" fill="none" stroke="#FFF7DC" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const MAP = {
  flower: FlowerArt,
  teddy: TeddyArt,
  chocolate: ChocolateArt,
  cake: CakeArt,
  coffee: CoffeeArt,
  book: BookArt,
  balloon: BalloonArt,
  media: PhotoArt,
}

export default function GiftArt({ id, className = '', label }) {
  const Art = MAP[id] || FlowerArt
  return (
    <span className={`block ${className}`} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <Art />
    </span>
  )
}
