import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { orderItems, orders, products, rewards, type OrderStatus } from '../db/schema.js';
import { env } from '../env.js';
import { requireAuth, userIdOf } from '../lib/auth.js';
import { deliveredAtFor, trackingAt } from '../lib/fulfilment.js';
import { HttpError, isUuid, notFound, parse } from '../lib/http.js';
import { priceLines, redeemReward, resolveCode } from '../lib/pricing.js';
import { PRIZES, REWARD_DAYS, pickPrize, rewardCode } from '../lib/prizes.js';
import { isUniqueViolation } from '../lib/slug.js';
import { rewardView } from './rewards.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `Enter your ${label}.` : `${label[0]!.toUpperCase() + label.slice(1)} looks too short.`)
    .max(max, `Keep it under ${max} characters.`);

const orderBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        qty: z.number().int().min(1, 'Quantity must be at least 1.').max(50, 'That’s a lot! Max 50 per item.'),
      }),
    )
    .min(1, 'Your bag is empty.')
    .max(60),
  address: z.object({
    flat: text(1, 60, 'flat or house number'),
    society: text(2, 80, 'society or street'),
    city: text(2, 40, 'city'),
    note: z.string().trim().max(140, 'Keep the rider note under 140 characters.').optional(),
  }),
  couponCode: z.string().trim().max(32).optional(),
  giftMessage: z.string().trim().max(160, 'Keep the gift message under 160 characters.').optional(),
});

type OrderRow = typeof orders.$inferSelect;
const ORDER: Record<OrderStatus, number> = { placed: 0, packing: 1, on_the_way: 2, delivered: 3 };

/** Persists the clock-derived status if it has moved forward. */
async function syncStatus(order: OrderRow) {
  const tracking = trackingAt(order.createdAt);
  if (ORDER[tracking.status] > ORDER[order.status]) {
    const deliveredAt = tracking.status === 'delivered' ? deliveredAtFor(order.createdAt) : null;
    await db
      .update(orders)
      .set({ status: tracking.status, deliveredAt })
      .where(and(eq(orders.id, order.id), ne(orders.status, 'delivered')));
    order.status = tracking.status;
    order.deliveredAt = deliveredAt;
  }
  return tracking;
}

async function findOwnOrder(req: Request) {
  const id = String(req.params.id);
  if (!isUuid(id)) throw notFound('We couldn’t find that order.');
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, userIdOf(req))));
  if (!order) throw notFound('We couldn’t find that order.');
  return order;
}

function orderView(order: OrderRow, items: { productId: number; name: string; pricePaise: number; qty: number }[]) {
  return {
    id: order.id,
    status: order.status,
    subtotalPaise: order.subtotalPaise,
    deliveryFeePaise: order.deliveryFeePaise,
    discountPaise: order.discountPaise,
    totalPaise: order.totalPaise,
    couponCode: order.couponCode,
    giftMessage: order.giftMessage,
    address: order.address,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    items,
  };
}

async function fullOrder(order: OrderRow) {
  const tracking = await syncStatus(order);
  const items = await db
    .select({ productId: orderItems.productId, name: orderItems.name, pricePaise: orderItems.pricePaise, qty: orderItems.qty, slug: products.slug })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.productId));
  const [reward] = await db.select().from(rewards).where(eq(rewards.sourceOrderId, order.id));
  return { ...orderView(order, items), tracking, reward: reward ? rewardView(reward) : null };
}

ordersRouter.post('/', async (req, res) => {
  const userId = userIdOf(req);
  const body = parse(orderBody, req.body);

  const created = await db.transaction(async (tx) => {
    const priced = await priceLines(tx, body.items);
    const code = body.couponCode ? body.couponCode : null;
    const resolved = code ? await resolveCode(tx, code, userId, priced.subtotalPaise, priced.deliveryFeePaise) : null;
    const discountPaise = resolved?.discountPaise ?? 0;

    const orderId = randomUUID();
    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        userId,
        subtotalPaise: priced.subtotalPaise,
        deliveryFeePaise: priced.deliveryFeePaise,
        discountPaise,
        totalPaise: priced.subtotalPaise + priced.deliveryFeePaise - discountPaise,
        couponCode: resolved?.code ?? null,
        giftMessage: body.giftMessage || null,
        address: { ...body.address, note: body.address.note || undefined },
      })
      .returning();

    // Conditional decrement: stock can never go negative, even under concurrent orders.
    // Sorted by id so concurrent transactions lock rows in the same order.
    for (const item of priced.items) {
      const updated = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.qty}` })
        .where(and(eq(products.id, item.productId), gte(products.stock, item.qty)))
        .returning({ id: products.id });
      if (updated.length === 0) {
        const [now] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, item.productId));
        const left = now?.stock ?? 0;
        throw new HttpError(
          409,
          left > 0 ? `Only ${left} ${item.name} left. Please reduce the quantity.` : `${item.name} just sold out. Please remove it from your bag.`,
          { productId: item.productId, available: left },
        );
      }
    }

    await tx.insert(orderItems).values(
      priced.items.map((i) => ({ orderId, productId: i.productId, name: i.name, pricePaise: i.pricePaise, qty: i.qty })),
    );

    if (resolved?.source === 'reward' && !(await redeemReward(tx, resolved.code, userId, orderId))) {
      throw new HttpError(409, 'That reward has already been used.', { couponCode: 'You have already used this reward.' });
    }
    return order!;
  });

  res.status(201).json({ order: await fullOrder(created) });
});

ordersRouter.get('/', async (req, res) => {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userIdOf(req)))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  const items = rows.length
    ? await db
        .select({ orderId: orderItems.orderId, productId: orderItems.productId, name: orderItems.name, pricePaise: orderItems.pricePaise, qty: orderItems.qty })
        .from(orderItems)
        .where(inArray(orderItems.orderId, rows.map((r) => r.id)))
    : [];
  const list = [];
  for (const row of rows) {
    const tracking = await syncStatus(row);
    list.push({
      ...orderView(row, items.filter((i) => i.orderId === row.id).map(({ orderId: _o, ...i }) => i)),
      tracking,
    });
  }
  res.json({ orders: list });
});

ordersRouter.get('/:id', async (req, res) => {
  res.json({ order: await fullOrder(await findOwnOrder(req)) });
});

ordersRouter.get('/:id/stream', async (req: Request, res: Response) => {
  const order = await findOwnOrder(req);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');

  let timer: NodeJS.Timeout | undefined;
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = undefined;
  };
  const tick = async () => {
    try {
      const tracking = await syncStatus(order);
      res.write(`data: ${JSON.stringify(tracking)}\n\n`);
      if (tracking.status === 'delivered') {
        stop();
        res.write('event: end\ndata: {}\n\n');
        res.end();
      }
    } catch (err) {
      stop();
      console.error(err);
      res.end();
    }
  };
  req.on('close', stop);
  await tick();
  if (!res.writableEnded) timer = setInterval(tick, env.STREAM_TICK_MS);
});

ordersRouter.post('/:id/spin', async (req, res) => {
  const order = await findOwnOrder(req);
  const tracking = await syncStatus(order);
  if (tracking.status !== 'delivered') {
    throw new HttpError(409, 'The wheel unlocks once your order is delivered.');
  }

  const existing = async () => {
    const [r] = await db.select().from(rewards).where(eq(rewards.sourceOrderId, order.id));
    return r;
  };
  const already = await existing();
  if (already) {
    throw new HttpError(409, 'You’ve already spun the wheel for this order.', { reward: rewardView(already) });
  }

  const prizeIndex = pickPrize();
  const prize = PRIZES[prizeIndex]!;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [reward] = await db
        .insert(rewards)
        .values({
          code: rewardCode(),
          userId: order.userId,
          sourceOrderId: order.id,
          prizeIndex,
          kind: prize.kind,
          value: prize.value,
          minSubtotalPaise: prize.minSubtotalPaise,
          maxDiscountPaise: prize.maxDiscountPaise,
          expiresAt: new Date(Date.now() + REWARD_DAYS * 24 * 60 * 60 * 1000),
        })
        .onConflictDoNothing({ target: rewards.sourceOrderId })
        .returning();
      if (!reward) {
        // A concurrent spin for the same order won the race.
        const won = await existing();
        throw new HttpError(409, 'You’ve already spun the wheel for this order.', won ? { reward: rewardView(won) } : undefined);
      }
      return void res.status(201).json({ prizeIndex, reward: rewardView(reward) });
    } catch (err) {
      if (err instanceof HttpError || !isUniqueViolation(err)) throw err;
      // reward code collision: try a fresh code
    }
  }
  throw new HttpError(500, 'Could not create a reward. Please try again.');
});
