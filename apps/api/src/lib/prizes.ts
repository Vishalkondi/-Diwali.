import { randomInt } from 'node:crypto';
import type { DiscountRule } from './pricing.js';

export type Prize = DiscountRule & { label: string; colour: string; weight: number };

/** The eight wheel segments, clockwise from the top. Everyone wins something. */
export const PRIZES: Prize[] = [
  { label: '5% off', colour: '#ff7a1a', weight: 22, kind: 'percent', value: 5, minSubtotalPaise: 0, maxDiscountPaise: 7500 },
  { label: '₹25 off', colour: '#ff3d81', weight: 20, kind: 'flat', value: 2500, minSubtotalPaise: 19900, maxDiscountPaise: null },
  { label: 'Free delivery', colour: '#27d3c3', weight: 18, kind: 'free_delivery', value: 0, minSubtotalPaise: 0, maxDiscountPaise: null },
  { label: '₹50 off', colour: '#ffb42e', weight: 14, kind: 'flat', value: 5000, minSubtotalPaise: 34900, maxDiscountPaise: null },
  { label: '10% off', colour: '#a64dff', weight: 12, kind: 'percent', value: 10, minSubtotalPaise: 0, maxDiscountPaise: 12000 },
  { label: '₹75 off', colour: '#ff5a4e', weight: 8, kind: 'flat', value: 7500, minSubtotalPaise: 49900, maxDiscountPaise: null },
  { label: '15% off', colour: '#2fbf6b', weight: 4, kind: 'percent', value: 15, minSubtotalPaise: 0, maxDiscountPaise: 20000 },
  { label: '₹151 off', colour: '#ffd23f', weight: 2, kind: 'flat', value: 15100, minSubtotalPaise: 99900, maxDiscountPaise: null },
];

export const REWARD_DAYS = 30;

/** Weighted pick using a CSPRNG, so the client can't predict or steer the result. */
export function pickPrize(): number {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = randomInt(total);
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i]!.weight;
    if (r < 0) return i;
  }
  return 0;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function rewardCode() {
  let s = 'SHUBH-';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}
