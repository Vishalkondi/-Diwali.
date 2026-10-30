export type Category = { id: number; slug: string; name: string; icon: string; tint: string };

export type Product = {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  pricePaise: number;
  stock: number;
  badge: string | null;
  category: { slug: string; name: string; icon: string; tint: string };
};

export type User = { id: string; name: string; email: string; createdAt: string };

export type OrderStatus = 'placed' | 'packing' | 'on_the_way' | 'delivered';

export type Tracking = {
  status: OrderStatus;
  stageProgress: number;
  elapsedSeconds: number;
  etaSeconds: number;
  totalSeconds: number;
  progress: number;
};

export type Reward = {
  code: string;
  prizeIndex: number;
  label: string;
  description: string;
  kind: 'percent' | 'flat' | 'free_delivery';
  minSubtotalPaise: number;
  sourceOrderId: string;
  used: boolean;
  expiresAt: string;
  expired: boolean;
};

export type Order = {
  id: string;
  status: OrderStatus;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  couponCode: string | null;
  giftMessage: string | null;
  address: { flat: string; society: string; city: string; note?: string };
  createdAt: string;
  deliveredAt: string | null;
  items: { productId: number; name: string; pricePaise: number; qty: number; slug?: string }[];
  tracking: Tracking;
  reward?: Reward | null;
};

export type WishTheme = 'diya' | 'rangoli' | 'fireworks';
export type Lang = 'en' | 'hi' | 'mr';

export type Wish = {
  slug: string;
  toName: string;
  fromName: string;
  message: string;
  theme: WishTheme;
  lang: Lang;
  views: number;
  createdAt: string;
};

export type Prize = { index: number; label: string; colour: string; description: string };
export type Coupon = { code: string; description: string; minSubtotalPaise: number; kind: string };
export type CouponCheck = {
  code: string;
  source: 'coupon' | 'reward';
  description: string;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  totalPaise: number;
};

export type Diya = { id: number; name: string; message: string; createdAt: string };

export type Stroke = { c: number; w: number; p: number[] };
export type Rangoli = {
  slug: string;
  name: string;
  folds: 6 | 8 | 12 | 16;
  mirror: boolean;
  views: number;
  createdAt: string;
  strokes: Stroke[];
};
