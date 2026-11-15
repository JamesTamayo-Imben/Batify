import { GIFTS } from './gifts'

export const OCCASIONS = {
  christmas: {
    id: 'christmas',
    priorityTheme: 'christmas',
    label: 'Christmas',
    dateLabel: 'Christmas date',
    titlePlaceholder: 'Maria’s Christmas Pamasko',
    shareText: 'Send a Christmas pamasko',
    greeting: 'Merry Christmas',
    wishButton: 'Send pamasko',
    starters: ['This Christmas, I wish you', 'Thank you for always', 'My favorite holiday memory is', 'My wish for your year ahead is'],
    defaults: {
      flower: 'Holiday flowers',
      teddy: 'Christmas teddy',
      chocolate: 'Christmas treats',
      cake: 'Holiday cake',
      coffee: 'Warm coffee',
      book: 'Holiday read',
      balloon: 'Holiday balloons',
      media: 'Photo or video',
    },
  },
  halloween: {
    id: 'halloween',
    priorityTheme: 'halloween',
    label: 'Halloween',
    dateLabel: 'Halloween date',
    titlePlaceholder: 'A Halloween treat',
    shareText: 'Send a Halloween treat',
    greeting: 'Happy Halloween',
    wishButton: 'Send a treat',
    starters: ['My favorite costume memory is', 'I hope this Halloween brings you', 'The thing I appreciate most about you is', 'A little treat for you...'],
    defaults: {
      flower: 'Autumn flowers',
      teddy: 'Spooky teddy',
      chocolate: 'Halloween treats',
      cake: 'Spooky cupcakes',
      coffee: 'Spiced coffee',
      book: 'Spooky story',
      balloon: 'Halloween balloons',
      media: 'Photo or video',
    },
  },
  valentines: {
    id: 'valentines',
    priorityTheme: 'valentines',
    label: "Valentine's Day",
    dateLabel: "Valentine's Day",
    titlePlaceholder: "A Valentine's surprise",
    shareText: "Send a Valentine's wish",
    greeting: 'Happy Valentine’s Day',
    wishButton: 'Send a Valentine',
    starters: ['I love how you', 'My favorite memory of us is', 'You make every day', 'I am grateful for'],
    defaults: {
      flower: 'Roses',
      teddy: 'Loveable teddy',
      chocolate: 'Sweet treats',
      cake: 'Valentine cake',
      coffee: 'Coffee date',
      book: 'Love story',
      balloon: 'Heart balloons',
      media: 'Photo or video',
    },
  },
  new_year: {
    id: 'new_year',
    priorityTheme: 'new_year',
    label: 'New Year',
    dateLabel: 'New Year date',
    titlePlaceholder: 'A wish for the New Year',
    shareText: 'Send a New Year wish',
    greeting: 'Happy New Year',
    wishButton: 'Send a New Year wish',
    starters: ['This New Year, I hope you', 'Thank you for being part of my year', 'One thing I want us to do this year is', 'Wishing you a year full of'],
    defaults: {
      flower: 'New Year flowers',
      teddy: 'New Year teddy',
      chocolate: 'New Year treats',
      cake: 'New Year cake',
      coffee: 'New Year coffee',
      book: 'Fresh-start read',
      balloon: 'Celebration balloons',
      media: 'Photo or video',
    },
  },
  anniversary: {
    id: 'anniversary',
    priorityTheme: null,
    label: 'Anniversary',
    dateLabel: 'Anniversary date',
    titlePlaceholder: 'Our anniversary',
    shareText: 'Send an anniversary wish',
    greeting: 'Happy anniversary',
    starters: ['My favorite memory of us is', 'Thank you for another year of', 'I still love when you', 'Here is to many more years of'],
    defaults: {
      flower: 'Anniversary flowers',
      teddy: 'Keepsake teddy',
      chocolate: 'Sweet treats',
      cake: 'Celebration cake',
      coffee: 'Coffee date',
      book: 'A book for us',
      balloon: 'Anniversary balloons',
      media: 'Photo or video',
    },
  },
}

export const CAMPAIGN_COLUMNS =
  'id,title,description,is_enabled,is_priority,start_month,start_day,end_month,end_day,gift_options'

const PRIORITY_THEME_ORDER = ['christmas', 'new_year', 'valentines', 'halloween']

export function occasionOf(id) {
  return OCCASIONS[id] ? OCCASIONS[id] : null
}

export function priorityThemeFor(campaigns, now = new Date()) {
  const active = (campaigns || []).filter((campaign) =>
    campaign?.is_priority === true &&
    campaign.id !== 'anniversary' &&
    occasionOf(campaign.id)?.priorityTheme &&
    isCampaignActive(campaign, now),
  )
  return PRIORITY_THEME_ORDER.find((id) => active.some((campaign) => campaign.id === id)) || null
}

export function giftOptionsFor(campaign) {
  const defaults = occasionOf(campaign?.id)?.defaults
  const options = campaign?.gift_options
  if (!options || typeof options !== 'object' || Array.isArray(options)) return defaults
  return Object.fromEntries(
    Object.entries(options).filter(([id, label]) =>
      GIFTS.some((gift) => gift.id === id) && typeof label === 'string' && label.trim(),
    ),
  )
}

function manilaMonthDay(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  return month * 100 + day
}

function dateOrdinal(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const timestamp = Date.UTC(year, month - 1, day)
  return new Date(timestamp).toISOString().slice(0, 10) === value
    ? Math.floor(timestamp / 86400000)
    : null
}

function manilaTodayOrdinal(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

export function isEventDateNotPast(value, now = new Date()) {
  const eventDay = dateOrdinal(value)
  return eventDay !== null && eventDay >= manilaTodayOrdinal(now)
}

export function isEventDateWithin30Days(value, now = new Date()) {
  const eventDay = dateOrdinal(value)
  const today = manilaTodayOrdinal(now)
  return eventDay !== null && eventDay >= today && eventDay <= today + 30
}

export function isCampaignActive(campaign, now = new Date()) {
  if (!campaign?.is_enabled) return false
  const start = Number(campaign.start_month) * 100 + Number(campaign.start_day)
  const end = Number(campaign.end_month) * 100 + Number(campaign.end_day)
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 101 || end < 101) return false

  const today = manilaMonthDay(now)
  return start <= end
    ? today >= start && today <= end
    : today >= start || today <= end
}

export function millisecondsUntilManilaMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  const nextMidnight = Date.UTC(year, month - 1, day + 1) - 8 * 60 * 60 * 1000
  return Math.max(1000, nextMidnight - now.getTime() + 50)
}
