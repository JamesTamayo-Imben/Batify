import { GIFTS } from './gifts'

export const OCCASIONS = {
  christmas: {
    id: 'christmas',
    priorityTheme: 'christmas',
    label: 'Christmas',
    dateLabel: 'Christmas date',
    titlePlaceholder: 'Maria’s Christmas letter',
    shareText: 'Send a Christmas greeting and pamasko',
    greeting: 'Merry Christmas',
    messageLabel: 'Your Christmas greeting',
    messageNoun: 'Christmas greeting',
    collectionLabel: 'Christmas greetings',
    sendHeading: 'Send Christmas greetings and gifts to',
    lockedLabel: 'Christmas greetings unlock',
    emptyMessages: 'No Christmas greetings yet. Be the first to send one below.',
    lockedDescription: 'You can still send a Christmas greeting. It will be waiting.',
    messageHint: 'Links are removed from messages.',
    revealLabel: 'Reveal messages at',
    revealHint: 'Messages and gifts stay hidden behind a countdown until this time. Leave it empty to show them right away.',
    revealButton: 'Use midnight on Christmas',
    wishButton: 'Send pamasko',
    starterHeading: 'Need a little Christmas inspiration?',
    starters: [
      'This Christmas, I’m grateful for',
      'One of my favorite memories with you is',
      'My favorite part of celebrating together is',
      'Thank you for bringing so much joy to',
      'I hope your holiday season is filled with',
      'Something I admire about you is',
      'One tradition I hope we keep is',
      'Here’s a little pamasko and a reminder that',
    ],
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
    messageLabel: 'Your Halloween message',
    messageNoun: 'Halloween message',
    collectionLabel: 'Halloween messages',
    revealLabel: 'Reveal messages at',
    starterHeading: 'Need a little Halloween inspiration?',
    wishButton: 'Send a treat',
    starters: [
      'My favorite costume memory is',
      'I hope this Halloween brings you',
      'The thing I appreciate most about you is',
      'A little treat for you',
      'My favorite spooky story is',
      'You make every October more fun by',
      'I hope you get plenty of',
      'My favorite Halloween tradition is',
    ],
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
    messageLabel: 'Your Valentine’s Day note',
    messageNoun: 'Valentine’s Day note',
    collectionLabel: 'Valentine’s Day notes',
    revealLabel: 'Reveal messages at',
    starterHeading: 'Need a little Valentine’s Day inspiration?',
    wishButton: 'Send a Valentine',
    starters: [
      'I love how you',
      'My favorite memory of us is',
      'You make every day',
      'I am grateful for',
      'I feel most cared for when you',
      'One little thing I adore about you is',
      'My favorite way to spend time with you is',
      'Thank you for making my life',
    ],
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
    messageLabel: 'Your New Year message',
    messageNoun: 'New Year message',
    collectionLabel: 'New Year messages',
    revealLabel: 'Reveal messages at',
    starterHeading: 'Need a little New Year inspiration?',
    wishButton: 'Send a New Year wish',
    starters: [
      'This New Year, I hope you',
      'Thank you for being part of my year',
      'One thing I want us to do this year is',
      'I hope the year ahead brings you',
      'A moment from this past year I’ll remember is',
      'Something I’m excited to do with you is',
      'You made this year better by',
      'Here’s to a fresh start and',
    ],
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
    previewTheme: 'anniversary',
    label: 'Anniversary',
    dateLabel: 'Anniversary date',
    titlePlaceholder: 'Our anniversary',
    shareText: 'Send an anniversary wish',
    greeting: 'Happy anniversary',
    messageLabel: 'Your anniversary message',
    messageNoun: 'anniversary message',
    collectionLabel: 'Anniversary messages',
    revealLabel: 'Reveal messages at',
    starterHeading: 'Need a little anniversary inspiration?',
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

export function previewThemeForCampaign(campaign) {
  const occasion = occasionOf(campaign?.id)
  if (campaign?.id === 'anniversary') return occasion?.previewTheme || null
  if (campaign?.is_priority === true) return occasion?.priorityTheme || null
  return null
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

export function isValidCampaignEventDate(value, campaign, now = new Date()) {
  if (campaign?.is_priority === true) return upcomingCampaignDate(campaign, now) === value
  if (campaign?.id === 'anniversary') return isEventDateNotPast(value, now)
  return isEventDateWithin30Days(value, now) || upcomingCampaignDate(campaign, now) === value
}

export function upcomingCampaignDate(campaign, now = new Date()) {
  if (!campaign || campaign.id === 'anniversary') return null
  const month = Number(campaign.end_month)
  const day = Number(campaign.end_day)
  if (!Number.isInteger(month) || month < 1 || month > 12 ||
    !Number.isInteger(day) || day < 1 || day > 31) return null

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const todayMonth = Number(parts.find((part) => part.type === 'month')?.value)
  const todayDay = Number(parts.find((part) => part.type === 'day')?.value)
  const eventYear = month * 100 + day < todayMonth * 100 + todayDay ? year + 1 : year
  return `${eventYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function priorityEventCountdown(campaigns, now = new Date()) {
  const priorityCampaigns = (campaigns || []).filter((campaign) =>
    campaign?.is_enabled !== false &&
    campaign?.is_priority === true &&
    campaign.id !== 'anniversary' &&
    occasionOf(campaign.id)?.priorityTheme,
  )
  const activeTheme = priorityThemeFor(priorityCampaigns, now)
  const activeCampaign = priorityCampaigns.find((campaign) => campaign.id === activeTheme)
  const candidates = activeCampaign ? [activeCampaign] : priorityCampaigns
  const nowTime = now.getTime()
  const upcoming = candidates
    .map((campaign) => {
      const date = upcomingCampaignDate(campaign, now)
      if (!date) return null
      let target = new Date(`${date}T00:00:00+08:00`).getTime()
      const isActive = isCampaignActive(campaign, now)
      const isEventDay = target <= nowTime && isActive
      if (isEventDay) target += 24 * 60 * 60 * 1000
      return target > nowTime ? { campaign, date, target, isActive, isEventDay } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.target - b.target)
  return upcoming[0] || null
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
