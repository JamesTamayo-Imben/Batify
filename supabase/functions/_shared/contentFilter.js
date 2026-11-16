const BLOCKED_TERMS = [
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'shitty', 'bullshit',
  'bitch', 'bastard', 'asshole', 'cunt', 'dickhead', 'piss', 'piss off', 'damn',
  'putangina', 'putanginamo', 'tangina', 'tanginamo', 'puta', 'putang',
  'gago', 'bobo', 'tanga', 'tarantado', 'kupal', 'leche', 'tae', 'ulol',
  'bwisit', 'lintik', 'hindot', 'kantot', 'yawa', 'buang', 'pisti', 'amaw',
  'animal ka',
]

function normalizeToken(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/@/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g')
    .replace(/2/g, 'z')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1')
}

const NORMALIZED_TERMS = BLOCKED_TERMS.map((term) => normalizeToken(term).replace(/ /g, ''))

export function containsBlockedLanguage(value) {
  if (typeof value !== 'string' || !value) return false
  const tokens = value.match(/[\p{L}\p{N}@!|$]+/gu) || []
  const normalized = tokens.map(normalizeToken).filter(Boolean)
  const compact = normalized.join('')
  return NORMALIZED_TERMS.some((term) =>
    normalized.some((token) => token.includes(term)) || compact.includes(term)
  )
}
