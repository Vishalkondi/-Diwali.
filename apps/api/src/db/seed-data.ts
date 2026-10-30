// Catalog seed. Prices are in paise (₹1 = 100 paise).

export const categorySeed = [
  { slug: 'diyas', name: 'Diyas', icon: 'diya', tint: '#ffd9a8' },
  { slug: 'rangoli', name: 'Rangoli', icon: 'rangoli', tint: '#ffc9dc' },
  { slug: 'lights', name: 'Lights', icon: 'lights', tint: '#fff0a8' },
  { slug: 'sweets', name: 'Sweets', icon: 'sweets', tint: '#ffe0c2' },
  { slug: 'gifts', name: 'Gifts', icon: 'gift', tint: '#e6d4ff' },
  { slug: 'puja', name: 'Puja', icon: 'thali', tint: '#ffd0b0' },
  { slug: 'torans', name: 'Torans', icon: 'toran', tint: '#ffe7a0' },
  { slug: 'sparklers', name: 'Sparklers', icon: 'sparkler', tint: '#c8f3ee' },
] as const;

type CategorySlug = (typeof categorySeed)[number]['slug'];

type ProductSeed = {
  slug: string;
  name: string;
  subtitle: string;
  price: number; // rupees, converted to paise on insert
  category: CategorySlug;
  badge?: string;
};

export const productSeed: ProductSeed[] = [
  { slug: 'clay-diyas', name: 'Clay Diyas', subtitle: 'Hand-painted terracotta · set of 12', price: 149, category: 'diyas', badge: 'Bestseller' },
  { slug: 'brass-akhand-diya', name: 'Brass Akhand Diya', subtitle: 'Long-burning, with glass chimney', price: 549, category: 'diyas' },
  { slug: 'floating-diyas', name: 'Floating Water Diyas', subtitle: 'Wax-filled · set of 6', price: 199, category: 'diyas', badge: 'Handmade' },
  { slug: 'rangoli-colours', name: 'Rangoli Colours', subtitle: '10 bright shades · 100 g each', price: 99, category: 'rangoli', badge: 'Popular' },
  { slug: 'rangoli-stencil-kit', name: 'Rangoli Stencil Kit', subtitle: '12 reusable designs + filler cone', price: 179, category: 'rangoli' },
  { slug: 'fairy-lights', name: 'Fairy Lights', subtitle: 'Warm white LED · 10 m', price: 249, category: 'lights', badge: 'Bestseller' },
  { slug: 'akash-kandil', name: 'Paper Akash Kandil', subtitle: 'Star lantern with holder', price: 299, category: 'lights', badge: 'Handmade' },
  { slug: 'curtain-lights', name: 'Curtain String Lights', subtitle: 'Multicolour · 3 × 2 m', price: 449, category: 'lights', badge: 'Save 20%' },
  { slug: 'kaju-katli', name: 'Kaju Katli', subtitle: 'Silver-leaf cashew fudge · 250 g', price: 199, category: 'sweets', badge: 'Fresh today' },
  { slug: 'motichoor-laddoo', name: 'Motichoor Laddoo', subtitle: 'Pure ghee · box of 12', price: 249, category: 'sweets', badge: 'Popular' },
  { slug: 'soan-papdi', name: 'Soan Papdi', subtitle: 'Flaky cardamom squares · 500 g', price: 159, category: 'sweets' },
  { slug: 'dry-fruit-box', name: 'Dry Fruit Gift Box', subtitle: 'Almonds, cashews, raisins · 400 g', price: 699, category: 'gifts', badge: 'Save 20%' },
  { slug: 'scented-candle-trio', name: 'Scented Candle Trio', subtitle: 'Sandalwood, rose, jasmine', price: 349, category: 'gifts' },
  { slug: 'brass-puja-thali', name: 'Brass Puja Thali', subtitle: '7-piece set with bell', price: 399, category: 'puja' },
  { slug: 'agarbatti-bundle', name: 'Agarbatti Bundle', subtitle: 'Sandalwood & rose · 120 sticks', price: 79, category: 'puja' },
  { slug: 'marigold-toran', name: 'Marigold Toran', subtitle: 'Fabric marigolds & mango leaves · 1 m', price: 129, category: 'torans', badge: 'Bestseller' },
  { slug: 'beaded-bandhanwar', name: 'Beaded Bandhanwar', subtitle: 'Mirror-work door hanging', price: 229, category: 'torans', badge: 'Handmade' },
  { slug: 'sparklers', name: 'Sparklers', subtitle: 'Green phuljhadi · pack of 10', price: 89, category: 'sparklers', badge: 'Popular' },

  // v2: gift hampers
  { slug: 'lakshmi-hamper', name: 'Lakshmi Puja Hamper', subtitle: 'Diyas, thali, kumkum, kaju katli', price: 1299, category: 'gifts', badge: 'Bestseller' },
  { slug: 'mithai-hamper', name: 'Mithai Hamper', subtitle: 'Four sweets in a keepsake box · 1 kg', price: 899, category: 'gifts', badge: 'Fresh today' },
  { slug: 'family-festive-hamper', name: 'Family Festive Hamper', subtitle: 'Dry fruits, sweets, lights & candles', price: 1999, category: 'gifts', badge: 'Save 20%' },
  { slug: 'eco-diwali-hamper', name: 'Eco Diwali Hamper', subtitle: 'Seed-paper cards, clay diyas, natural colours', price: 799, category: 'gifts', badge: 'Handmade' },

  // v2: puja and decor
  { slug: 'lakshmi-ganesh-idol', name: 'Lakshmi-Ganesh Idol', subtitle: 'Brass finish · 6 inch', price: 899, category: 'puja', badge: 'Popular' },
  { slug: 'kumkum-haldi-set', name: 'Kumkum-Haldi Set', subtitle: 'With chandan & akshat in a carved box', price: 149, category: 'puja' },
  { slug: 'ghee-cotton-wicks', name: 'Ghee Cotton Wicks', subtitle: 'Ready to light · 100 pieces', price: 99, category: 'puja', badge: 'Bestseller' },
  { slug: 'marigold-garlands', name: 'Marigold Garlands', subtitle: 'Fresh genda phool · 5 strings', price: 199, category: 'torans', badge: 'Fresh today' },
];

export const couponSeed = [
  { code: 'DIWALI10', description: '10% off on ₹299+, up to ₹150', kind: 'percent', value: 10, minSubtotalPaise: 29900, maxDiscountPaise: 15000 },
  { code: 'DIYA50', description: '₹50 off on ₹249+', kind: 'flat', value: 5000, minSubtotalPaise: 24900, maxDiscountPaise: null },
  { code: 'FREEDEL', description: 'Free delivery on any order', kind: 'free_delivery', value: 0, minSubtotalPaise: 0, maxDiscountPaise: null },
  { code: 'LAKSHMI100', description: '₹100 off on ₹799+', kind: 'flat', value: 10000, minSubtotalPaise: 79900, maxDiscountPaise: null },
] as const;
