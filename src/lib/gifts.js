export const GIFTS = [
  { id: 'flower', emoji: '💐', label: 'Flowers' },
  { id: 'teddy', emoji: '🧸', label: 'Teddy' },
  { id: 'chocolate', emoji: '🍫', label: 'Chocolate' },
  { id: 'media', emoji: '📸', label: 'Photo / Video' },
]
export const giftEmoji = (id) => GIFTS.find((g) => g.id === id)?.emoji || '🎁'
export const giftLabel = (id) => GIFTS.find((g) => g.id === id)?.label || 'Gift'
