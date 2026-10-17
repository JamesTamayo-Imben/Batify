// Inline SVG icon set (24px grid, round caps). Decorative by default; pass `label` to expose to screen readers.
const P = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  key: <><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  share: <><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></>,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-2" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M3 17l5-5 4 4 3-3 6 6" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  sliders: <><path d="M4 7h9M19 7h1M4 17h1M11 17h9" /><circle cx="16" cy="7" r="2.2" /><circle cx="8" cy="17" r="2.2" /></>,
  heart: <path d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z" />,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13M12 8C10 3.5 6 4.5 7.200 7.500M12 8c2-4.500 6-3.500 4.800-.5" /></>,
  eye: <><path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.01" /></>,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  send: <><path d="M21 3L3 11l7 3 3 7z" /><path d="M10 14l11-11" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  link: <path d="M10 14a4 4 0 005.700 0l3-3a4 4 0 00-5.700-5.700l-1 1M14 10a4 4 0 00-5.700 0l-3 3a4 4 0 005.700 5.700l1-1" />,
  pencil: <><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 6l3 3" /></>,
  users: <><circle cx="9" cy="8" r="3.500" /><path d="M2.500 20a6.500 6.500 0 0113 0M16 4.500a3.500 3.500 0 010 7M18 14.500a6.500 6.500 0 013.500 5.500" /></>,
  play: <path d="M8 5l11 7-11 7z" />,
}

export default function Icon({ name, size = 22, className = '', strokeWidth = 2, label }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} {...a11y}>
      {P[name]}
    </svg>
  )
}
