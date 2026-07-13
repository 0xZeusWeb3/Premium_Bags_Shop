export function formatPrice(price) {
  return `\u20B9 ${Number(price).toLocaleString('en-IN')}`;
}

export const PLATFORM_FEE = 20;

export const CATEGORIES = [
  { label: "Women's Collection", sub: [
    'Handbags', 'Tote Bags', 'Shoulder Bags', 'Crossbody Bags',
    'Clutch Bags', 'Mini Bags', 'Bucket Bags', 'Hobo Bags',
  ]},
  { label: "Men's Collection", sub: [
    'Backpacks', 'Messenger Bags', 'Laptop Bags', 'Briefcases',
    'Sling Bags', 'Duffel Bags',
  ]},
  { label: 'Travel', sub: [
    'Travel Bags', 'Weekender Bags', 'Cabin Bags', 'Rolling Luggage',
    'Garment Bags',
  ]},
  { label: 'Accessories', sub: [
    'Wallets', 'Card Holders', 'Cosmetic Bags', 'Toiletry Bags',
    'Pouches', 'Key Holders',
  ]},
];

export const ALL_SUBCATEGORIES = CATEGORIES.flatMap(c => c.sub);

export function getEffectivePrice(p) {
  return p.discount_price || p.price;
}

export function getDiscountPercent(p) {
  if (!p.discount_price || p.discount_price >= p.price) return 0;
  return Math.round((1 - p.discount_price / p.price) * 100);
}
