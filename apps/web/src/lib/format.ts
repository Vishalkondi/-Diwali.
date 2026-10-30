const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** ₹ with Indian digit grouping, e.g. 129900 paise → "₹1,299". */
export const inr = (paise: number) => '₹' + inrFmt.format(paise / 100);

export const FREE_DELIVERY_FROM = 49900;
export const DELIVERY_FEE = 2900;
export const deliveryFeeFor = (subtotal: number) => (subtotal >= FREE_DELIVERY_FROM || subtotal === 0 ? 0 : DELIVERY_FEE);

export const mmss = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const STATUS_LABEL = {
  placed: 'Order placed',
  packing: 'Packing',
  on_the_way: 'On the way',
  delivered: 'Delivered',
} as const;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Only same-origin paths are allowed as post-login redirects. */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
