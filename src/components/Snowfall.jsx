const FLAKE_COUNT = 18
const ROTATIONS = [0, 60, 120, 180, 240, 300]

function Snowflake({ variant }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {ROTATIONS.map((rotation) => (
        <g key={rotation} transform={`rotate(${rotation} 50 50)`}>
          <path d="M50 52V10M50 24L38 12M50 24L62 12M50 40L36 26M50 40L64 26" />
        </g>
      ))}
      {variant === 0
        ? <circle className="snowflake-center" cx="50" cy="50" r="8" />
        : <path className="snowflake-center" d="M50 39l11 11-11 11-11-11z" />}
    </svg>
  )
}

export default function Snowfall() {
  return (
    <div className="seasonal-snow" aria-hidden="true">
      {Array.from({ length: FLAKE_COUNT }, (_, index) => (
        <span
          key={index}
          className="snowflake"
          style={{
            '--snow-x': `${(index * 53) % 100}%`,
            '--snow-top': `${(index * 47) % 100}%`,
            '--snow-size': `${14 + (index % 4) * 6}px`,
            '--snow-duration': `${10 + (index % 8) * 1.3}s`,
            '--snow-delay': `${-((index * 1.7) % 20)}s`,
            '--snow-drift': `${((index * 41) % 100) - 50}px`,
          }}
        >
          <Snowflake variant={index % 2} />
        </span>
      ))}
    </div>
  )
}
