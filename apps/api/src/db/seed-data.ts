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

/** Longer copy for the product page. */
export const productDescriptions: Record<string, string> = {
  'clay-diyas': 'Wheel-thrown terracotta diyas, hand-painted in marigold, red and white. Fill with ghee or oil and a cotton wick; each burns for about four hours.',
  'brass-akhand-diya': 'A solid brass diya on a stand with a glass chimney that keeps the flame steady through the night, for the akhand jyot on Lakshmi Puja.',
  'floating-diyas': 'Little wax-filled diyas that float in a bowl or urli of water. Scatter a few rose petals between them for a centrepiece.',
  'rangoli-colours': 'Ten fine, bright powders in resealable pouches, easy to pinch and pour. Made with chalk and food-safe dyes.',
  'rangoli-stencil-kit': 'Twelve reusable plastic stencils, from lotus to peacock, with a filler cone and a dotted guide for freehand borders.',
  'fairy-lights': 'Ten metres of warm-white LED fairy lights on a thin copper wire with eight modes. Plug in, or run them from a power bank.',
  'akash-kandil': 'A five-point paper star lantern with a bulb holder and paper tassels. It folds flat for storage after the festival.',
  'curtain-lights': 'Ten strands of multicolour bulbs that hang like a curtain, for a window or a balcony railing. Comes with a timer.',
  'kaju-katli': 'Silky cashew fudge from the neighbourhood halwai, rolled thin, cut into diamonds and finished with silver leaf. Made fresh each morning.',
  'motichoor-laddoo': 'Tiny boondi fried in pure ghee, soaked in saffron syrup and rolled into laddoos with cardamom and melon seeds.',
  'soan-papdi': 'Flaky, melt-in-the-mouth squares flavoured with cardamom and topped with pistachio slivers. Keeps for weeks.',
  'dry-fruit-box': 'Californian almonds, W240 cashews and golden raisins in a three-section keepsake box, ready to gift.',
  'scented-candle-trio': 'Three soy-wax candles in sandalwood, rose and jasmine, each poured into a reusable glass jar. About 20 hours each.',
  'brass-puja-thali': 'A seven-piece brass thali with a diya, kalash, bell, incense stand, kumkum and haldi bowls and a spoon.',
  'agarbatti-bundle': 'Hand-rolled sandalwood and rose incense sticks with a brass stand. About 45 minutes per stick.',
  'marigold-toran': 'Fabric marigolds and mango leaves on a one-metre toran, to hang over the main door. It looks fresh every Diwali.',
  'beaded-bandhanwar': 'A door hanging with mirror-work discs and strings of glass beads that catch the diya light.',
  'sparklers': 'Ten green phuljhadi sparklers with low smoke. Hold them at arm’s length, and keep a bucket of water close by.',
  'lakshmi-hamper': 'Everything for Lakshmi Puja in one basket: clay diyas, a brass thali, kumkum and haldi, and a box of kaju katli.',
  'mithai-hamper': 'A one-kilo keepsake box with four mithai: kaju katli, motichoor laddoo, soan papdi and milk barfi.',
  'family-festive-hamper': 'Our biggest hamper: dry fruits, two boxes of mithai, fairy lights and scented candles, packed in a wicker basket.',
  'eco-diwali-hamper': 'Seed-paper greeting cards that grow into tulsi, unpainted clay diyas and natural rangoli colours, in a jute basket.',
  'lakshmi-ganesh-idol': 'A six-inch Lakshmi-Ganesh idol in brass finish, seated on a lotus base. Heavy enough to stay put on the mandir shelf.',
  'kumkum-haldi-set': 'Kumkum, haldi, chandan and akshat in a carved sheesham box with four wells and a sliding lid.',
  'ghee-cotton-wicks': 'One hundred cotton wicks pre-soaked in pure cow ghee. Place one in a diya and light it.',
  'marigold-garlands': 'Five strings of fresh genda phool, delivered the same morning. Hang them on doors, the mandir or the thali.',
};

/** Demo reviewers. Their password hash is not a valid bcrypt hash, so nobody can sign in as them. */
export const reviewerSeed = [
  { email: 'priya@reviewers.utsavly.invalid', name: 'Priya S.' },
  { email: 'rahul@reviewers.utsavly.invalid', name: 'Rahul M.' },
  { email: 'ananya@reviewers.utsavly.invalid', name: 'Ananya K.' },
  { email: 'vikram@reviewers.utsavly.invalid', name: 'Vikram J.' },
];

/** [product slug, reviewer index, rating, body] */
export const reviewSeed: [string, number, number, string][] = [
  ['clay-diyas', 0, 5, 'Beautifully painted and they arrived without a single chip. Lit all twelve on the balcony.'],
  ['clay-diyas', 1, 4, 'Lovely colours. A couple were slightly uneven at the base but they burn well.'],
  ['clay-diyas', 2, 5, 'Ordered at 7 pm, lit by 7:15. Exactly what I needed.'],
  ['fairy-lights', 0, 4, 'Warm, cosy glow. Wish the cable were a bit longer to the plug.'],
  ['fairy-lights', 3, 5, 'Bright, and the twinkle mode is not too fast. Great value.'],
  ['kaju-katli', 1, 5, 'Tastes like the halwai near my nani’s house. Gone in a day.'],
  ['kaju-katli', 2, 5, 'Soft, not too sweet, proper silver leaf.'],
  ['kaju-katli', 3, 4, 'Very fresh. A slightly bigger box would be nice.'],
  ['motichoor-laddoo', 0, 5, 'Melt-in-the-mouth, you can taste the ghee.'],
  ['motichoor-laddoo', 3, 4, 'Good laddoos, a little sweet for me but the family loved them.'],
  ['rangoli-colours', 2, 5, 'The pink and green are so vivid. Easy to pour too.'],
  ['rangoli-colours', 1, 4, 'Nice shades. The white could be finer.'],
  ['lakshmi-hamper', 0, 5, 'Saved me three shop visits. Everything for the puja in one basket.'],
  ['lakshmi-hamper', 2, 5, 'Gifted it to my in-laws and they loved the thali.'],
  ['sparklers', 3, 4, 'Low smoke as promised, and the kids were thrilled.'],
  ['sparklers', 1, 3, 'Fun, but a couple fizzled out early.'],
  ['akash-kandil', 2, 5, 'Gorgeous on the balcony. Neighbours asked where I got it.'],
  ['brass-puja-thali', 1, 5, 'Solid brass, good weight, and the bell has a sweet sound.'],
  ['marigold-toran', 0, 4, 'Looks almost real from a distance. Will reuse next year.'],
  ['mithai-hamper', 3, 5, 'Perfect corporate gift. The box itself is reusable.'],
  ['dry-fruit-box', 2, 4, 'Good-quality nuts, nice box. The raisins could be plumper.'],
  ['family-festive-hamper', 1, 5, 'Huge hamper, worth every rupee. The candles smell amazing.'],
  ['scented-candle-trio', 0, 5, 'The sandalwood one is my favourite. Burns clean.'],
];
