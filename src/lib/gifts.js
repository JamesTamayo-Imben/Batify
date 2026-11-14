// Gift catalog. Illustrations live in components/art/GiftArt.jsx.
export const GIFTS = [
  { id: 'flower', label: 'Flowers', color: '#E0518B', ribbon: '#F7C531' },
  { id: 'teddy', label: 'Teddy bear', color: '#B8793E', ribbon: '#C92F20' },
  { id: 'chocolate', label: 'Chocolate', color: '#5B3426', ribbon: '#F7C531' },
  { id: 'cake', label: 'Cake', color: '#F2C48D', ribbon: '#C92F20' },
  { id: 'coffee', label: 'Coffee', color: '#7A4934', ribbon: '#F7C531' },
  { id: 'book', label: 'Book', color: '#1F33C7', ribbon: '#FFFFFF' },
  { id: 'balloon', label: 'Balloons', color: '#9B7BEA', ribbon: '#FFFFFF' },
  { id: 'media', label: 'Photo or video', color: '#1F33C7', ribbon: '#FFFFFF' },
]
export const giftLabel = (id) => GIFTS.find((g) => g.id === id)?.label || 'Gift'
export const giftColors = (id) => GIFTS.find((g) => g.id === id) || { color: '#1F33C7', ribbon: '#F7C531' }
