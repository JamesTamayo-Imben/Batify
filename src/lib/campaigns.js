import { GIFTS } from './gifts'

export const OCCASIONS = {
  christmas: {
    id: 'christmas',
    label: 'Christmas',
    dateLabel: 'Christmas date',
    titlePlaceholder: 'Maria’s Christmas Pamasko',
    shareText: 'Send a Christmas pamasko',
    defaults: {
      flower: 'Holiday flowers',
      teddy: 'Christmas teddy',
      chocolate: 'Christmas treats',
      media: 'Photo or video',
    },
  },
  valentines: {
    id: 'valentines',
    label: "Valentine's Day",
    dateLabel: "Valentine's Day",
    titlePlaceholder: "A Valentine's surprise",
    shareText: "Send a Valentine's wish",
    defaults: {
      flower: 'Roses',
      teddy: 'Loveable teddy',
      chocolate: 'Sweet treats',
      media: 'Photo or video',
    },
  },
  anniversary: {
    id: 'anniversary',
    label: 'Anniversary',
    dateLabel: 'Anniversary date',
    titlePlaceholder: 'Our anniversary',
    shareText: 'Send an anniversary wish',
    defaults: {
      flower: 'Anniversary flowers',
      teddy: 'Keepsake teddy',
      chocolate: 'Sweet treats',
      media: 'Photo or video',
    },
  },
}

export const CAMPAIGN_COLUMNS =
  'id,title,description,is_enabled,start_month,start_day,end_month,end_day,gift_options'

export function occasionOf(id) {
  return OCCASIONS[id] ? OCCASIONS[id] : null
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
