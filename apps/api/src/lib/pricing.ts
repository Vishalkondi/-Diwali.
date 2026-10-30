import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import type { Db, Tx } from '../db/client.js';
import { coupons, products, rewards, type DiscountKind } from '../db/schema.js';
import { HttpError } from './http.js';

export const DELIVERY_FEE_PAISE = 2900;
export const FREE_DELIVERY_FROM_PAISE = 49900;

export const deliveryFeeFor = (subtotalPaise: number) =>
  subtotalPaise >= FREE_DELIVERY_FROM_PAISE ? 0 : DELIVERY_FEE_PAISE;

export const rupees = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export type DiscountRule = {
  kind: DiscountKind;
  value: number;
  minSubtotalPaise: number;
  maxDiscountPaise: number | null;
};

/** How much a rule takes off, or a friendly 400 explaining why it can't apply. */
export function discountFor(rule: DiscountRule, code: string, subtotalPaise: number, deliveryFeePaise: number) {
  if (subtotalPaise < rule.minSubtotalPaise) {
    throw new HttpError(400, `Add ${rupees(rule.minSubtotalPaise - subtotalPaise)} more to use ${code}.`, {
      couponCode: `${code} needs a bag of ${rupees(rule.minSubtotalPaise)} or more.`,
    });
  }
  let discount: number;
  switch (rule.kind) {
    case 'percent':
      // Rounded down to whole rupees, so totals never show paise.
      discount = Math.floor((subtotalPaise * rule.value) / 100 / 100) * 100;
      break;
    case 'flat':
      discount = rule.value;
      break;
    case 'free_delivery':
      if (deliveryFeePaise === 0) {
        throw new HttpError(400, 'Delivery is already free on this order.', {
          couponCode: `Delivery is free above ${rupees(FREE_DELIVERY_FROM_PAISE)}, so ${code} has nothing to take off.`,
        });
      }
      discount = deliveryFeePaise;
      break;
  }
  if (rule.maxDiscountPaise != null) discount = Math.min(discount, rule.maxDiscountPaise);
  return Math.min(discount, subtotalPaise + deliveryFeePaise);
}

export function describeRule(rule: DiscountRule) {
  const min = rule.minSubtotalPaise > 0 ? ` on ${rupees(rule.minSubtotalPaise)}+` : '';
  switch (rule.kind) {
    case 'percent':
      return `${rule.value}% off${min}` + (rule.maxDiscountPaise ? `, up to ${rupees(rule.maxDiscountPaise)}` : '');
    case 'flat':
      return `${rupees(rule.value)} off${min}`;
    case 'free_delivery':
      return `Free delivery${min}`;
  }
}

export const normaliseCode = (code: string) => code.trim().toUpperCase();

export type ResolvedCode = {
  code: string;
  source: 'coupon' | 'reward';
  description: string;
  discountPaise: number;
};

/** Looks a code up as a public coupon first, then as the signed-in user's unused reward. */
export async function resolveCode(
  q: Db | Tx,
  rawCode: string,
  userId: string | null,
  subtotalPaise: number,
  deliveryFeePaise: number,
): Promise<ResolvedCode> {
  const code = normaliseCode(rawCode);
  const invalid = () =>
    new HttpError(400, `${code} isn't a valid code.`, { couponCode: 'That code is not valid.' });

  const [coupon] = await q.select().from(coupons).where(eq(coupons.code, code));
  if (coupon) {
    if (!coupon.active) throw invalid();
    if (coupon.expiresAt && coupon.expiresAt <= new Date()) {
      throw new HttpError(400, `${code} has expired.`, { couponCode: 'That code has expired.' });
    }
    return {
      code,
      source: 'coupon',
      description: coupon.description,
      discountPaise: discountFor(coupon, code, subtotalPaise, deliveryFeePaise),
    };
  }

  if (!userId) throw invalid();
  const [reward] = await q.select().from(rewards).where(and(eq(rewards.code, code), eq(rewards.userId, userId)));
  if (!reward) throw invalid();
  if (reward.usedOrderId) {
    throw new HttpError(400, `${code} has already been used.`, { couponCode: 'You have already used this reward.' });
  }
  if (reward.expiresAt <= new Date()) {
    throw new HttpError(400, `${code} has expired.`, { couponCode: 'This reward has expired.' });
  }
  return {
    code,
    source: 'reward',
    description: describeRule(reward),
    discountPaise: discountFor(reward, code, subtotalPaise, deliveryFeePaise),
  };
}

/** Marks a reward used by an order; false if someone (or another tab) got there first. */
export async function redeemReward(tx: Tx, code: string, userId: string, orderId: string) {
  const rows = await tx
    .update(rewards)
    .set({ usedOrderId: orderId })
    .where(
      and(
        eq(rewards.code, code),
        eq(rewards.userId, userId),
        isNull(rewards.usedOrderId),
        gt(rewards.expiresAt, sql`now()`),
      ),
    )
    .returning({ code: rewards.code });
  return rows.length === 1;
}

export type LineInput = { productId: number; qty: number };

/** Merges duplicate lines and prices them from the database, ignoring anything the client claims. */
export async function priceLines(q: Db | Tx, lines: LineInput[]) {
  const merged = new Map<number, number>();
  for (const l of lines) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.qty);

  const ids = [...merged.keys()];
  const rows = ids.length
    ? await q
        .select({ id: products.id, name: products.name, pricePaise: products.pricePaise, stock: products.stock })
        .from(products)
        .where(inArray(products.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new HttpError(400, 'Some items in your bag are no longer available.', { items: `Unknown product ${missing.join(', ')}` });
  }

  const items = ids.map((id) => {
    const p = byId.get(id)!;
    return { productId: id, name: p.name, pricePaise: p.pricePaise, qty: merged.get(id)!, stock: p.stock };
  });
  const subtotalPaise = items.reduce((s, i) => s + i.pricePaise * i.qty, 0);
  return { items, subtotalPaise, deliveryFeePaise: deliveryFeeFor(subtotalPaise) };
}
