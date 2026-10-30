import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { coupons, rewards } from '../db/schema.js';
import { optionalAuth, requireAuth, userIdOf } from '../lib/auth.js';
import { parse } from '../lib/http.js';
import { describeRule, priceLines, resolveCode } from '../lib/pricing.js';
import { PRIZES } from '../lib/prizes.js';

type RewardRow = typeof rewards.$inferSelect;

export const rewardView = (r: RewardRow) => ({
  code: r.code,
  prizeIndex: r.prizeIndex,
  label: PRIZES[r.prizeIndex]?.label ?? describeRule(r),
  description: describeRule(r),
  kind: r.kind,
  minSubtotalPaise: r.minSubtotalPaise,
  sourceOrderId: r.sourceOrderId,
  used: r.usedOrderId !== null,
  expiresAt: r.expiresAt,
  expired: r.expiresAt <= new Date(),
});

export const rewardsRouter = Router();

rewardsRouter.get('/prizes', (_req, res) => {
  res.json({
    prizes: PRIZES.map((p, index) => ({ index, label: p.label, colour: p.colour, description: describeRule(p) })),
  });
});

rewardsRouter.get('/coupons', async (_req, res) => {
  const rows = await db
    .select({ code: coupons.code, description: coupons.description, minSubtotalPaise: coupons.minSubtotalPaise, kind: coupons.kind })
    .from(coupons)
    .where(and(eq(coupons.active, true), eq(coupons.isPublic, true), sql`(${coupons.expiresAt} IS NULL OR ${coupons.expiresAt} > now())`))
    .orderBy(coupons.minSubtotalPaise);
  res.json({ coupons: rows });
});

const validateBody = z.object({
  code: z.string().trim().min(1, 'Enter a code.').max(32),
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(50) }))
    .min(1, 'Your bag is empty.')
    .max(60),
});

rewardsRouter.post('/coupons/validate', optionalAuth, async (req, res) => {
  const body = parse(validateBody, req.body);
  const priced = await priceLines(db, body.items);
  const resolved = await resolveCode(db, body.code, req.userId ?? null, priced.subtotalPaise, priced.deliveryFeePaise);
  res.json({
    code: resolved.code,
    source: resolved.source,
    description: resolved.description,
    subtotalPaise: priced.subtotalPaise,
    deliveryFeePaise: priced.deliveryFeePaise,
    discountPaise: resolved.discountPaise,
    totalPaise: priced.subtotalPaise + priced.deliveryFeePaise - resolved.discountPaise,
  });
});

rewardsRouter.get('/rewards', requireAuth, async (req, res) => {
  const rows = await db.select().from(rewards).where(eq(rewards.userId, userIdOf(req))).orderBy(desc(rewards.createdAt));
  const unused = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rewards)
    .where(and(eq(rewards.userId, userIdOf(req)), isNull(rewards.usedOrderId), gt(rewards.expiresAt, sql`now()`)));
  res.json({ rewards: rows.map(rewardView), unused: unused[0]?.n ?? 0 });
});
