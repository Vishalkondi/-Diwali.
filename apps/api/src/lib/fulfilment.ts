import { env } from '../env.js';
import type { OrderStatus } from '../db/schema.js';

/**
 * Fulfilment is a stateless clock: an order's status is a pure function of the time
 * since it was created. Nothing runs in the background; reads persist the derived
 * status lazily.
 */
export const STAGES = ['placed', 'packing', 'on_the_way'] as const;

export function stageDurations() {
  return {
    placed: env.FULFIL_PLACED_SECONDS,
    packing: env.FULFIL_PACKING_SECONDS,
    on_the_way: env.FULFIL_ON_THE_WAY_SECONDS,
  };
}

export type Tracking = {
  status: OrderStatus;
  /** 0–1 within the current stage (1 once delivered). */
  stageProgress: number;
  elapsedSeconds: number;
  etaSeconds: number;
  totalSeconds: number;
  /** 0–1 across the whole journey. */
  progress: number;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

export function trackingAt(createdAt: Date, now = new Date()): Tracking {
  const d = stageDurations();
  const totalSeconds = d.placed + d.packing + d.on_the_way;
  const elapsed = Math.max(0, (now.getTime() - createdAt.getTime()) / 1000);

  let status: OrderStatus = 'delivered';
  let stageProgress = 1;
  let start = 0;
  for (const stage of STAGES) {
    if (elapsed < start + d[stage]) {
      status = stage;
      stageProgress = (elapsed - start) / d[stage];
      break;
    }
    start += d[stage];
  }

  return {
    status,
    stageProgress: round(stageProgress),
    elapsedSeconds: round(Math.min(elapsed, totalSeconds)),
    etaSeconds: round(Math.max(0, totalSeconds - elapsed)),
    totalSeconds,
    progress: round(Math.min(1, elapsed / totalSeconds)),
  };
}

export function deliveredAtFor(createdAt: Date) {
  const d = stageDurations();
  return new Date(createdAt.getTime() + (d.placed + d.packing + d.on_the_way) * 1000);
}
