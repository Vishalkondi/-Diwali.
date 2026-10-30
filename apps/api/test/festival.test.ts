import { eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { db } from '../src/db/client.js';
import { coupons, rewards } from '../src/db/schema.js';
import { address, app, productBySlug, signedInAgent, waitForDelivery } from './helpers.js';

async function line(slug: string, qty = 1) {
  return { productId: (await productBySlug(slug)).id, qty };
}

describe('coupons', () => {
  it('lists public prizes and offers', async () => {
    const prizes = await request(app).get('/api/prizes');
    expect(prizes.body.prizes).toHaveLength(8);
    const offers = await request(app).get('/api/coupons');
    expect(offers.body.coupons.map((c: { code: string }) => c.code).sort()).toEqual(['DIWALI10', 'DIYA50', 'FREEDEL', 'LAKSHMI100']);
  });

  it('DIWALI10: 10% on ₹299+ (whole rupees), capped at ₹150, code is case-insensitive', async () => {
    const small = await request(app).post('/api/coupons/validate').send({ code: ' diwali10 ', items: [await line('akash-kandil')] }); // ₹299
    expect(small.status).toBe(200);
    // 10% of ₹299 is ₹29.90, rounded down to ₹29
    expect(small.body).toMatchObject({ code: 'DIWALI10', subtotalPaise: 29900, deliveryFeePaise: 2900, discountPaise: 2900, totalPaise: 29900 + 2900 - 2900 });

    const big = await request(app).post('/api/coupons/validate').send({ code: 'DIWALI10', items: [await line('family-festive-hamper')] }); // ₹1999
    expect(big.body.discountPaise).toBe(15000);
  });

  it('explains a minimum that is not met', async () => {
    const res = await request(app).post('/api/coupons/validate').send({ code: 'DIWALI10', items: [await line('sparklers')] }); // ₹89
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Add ₹210 more to use DIWALI10/);
    expect(res.body.details.couponCode).toBeTypeOf('string');
  });

  it('DIYA50 and LAKSHMI100 take flat amounts off', async () => {
    const diya = await request(app).post('/api/coupons/validate').send({ code: 'DIYA50', items: [await line('fairy-lights')] });
    expect(diya.body.discountPaise).toBe(5000);
    const lakshmi = await request(app).post('/api/coupons/validate').send({ code: 'LAKSHMI100', items: [await line('lakshmi-ganesh-idol')] });
    expect(lakshmi.body.discountPaise).toBe(10000);
    const short = await request(app).post('/api/coupons/validate').send({ code: 'LAKSHMI100', items: [await line('fairy-lights')] });
    expect(short.status).toBe(400);
  });

  it('FREEDEL waives the fee, and says so when delivery is already free', async () => {
    const ok = await request(app).post('/api/coupons/validate').send({ code: 'FREEDEL', items: [await line('sparklers')] });
    expect(ok.body).toMatchObject({ discountPaise: 2900, totalPaise: 8900 });
    const already = await request(app).post('/api/coupons/validate').send({ code: 'FREEDEL', items: [await line('lakshmi-hamper')] });
    expect(already.status).toBe(400);
    expect(already.body.error).toMatch(/already free/);
  });

  it('rejects unknown, inactive and expired codes', async () => {
    await db.insert(coupons).values([
      { code: 'OLDDIWALI', description: 'expired', kind: 'flat', value: 1000, expiresAt: new Date('2024-11-01T00:00:00Z'), isPublic: false },
      { code: 'PAUSED', description: 'inactive', kind: 'flat', value: 1000, active: false },
    ]);
    const items = [await line('fairy-lights')];
    const unknown = await request(app).post('/api/coupons/validate').send({ code: 'NOPE', items });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error).toMatch(/isn't a valid code/);
    const expired = await request(app).post('/api/coupons/validate').send({ code: 'OLDDIWALI', items });
    expect(expired.body.error).toMatch(/expired/);
    const paused = await request(app).post('/api/coupons/validate').send({ code: 'PAUSED', items });
    expect(paused.status).toBe(400);
    const offers = await request(app).get('/api/coupons');
    expect(offers.body.coupons.map((c: { code: string }) => c.code)).not.toContain('OLDDIWALI');
  });

  it('applies a coupon and gift message to an order, priced on the server', async () => {
    const { agent } = await signedInAgent();
    const res = await agent.post('/api/orders').send({
      items: [await line('fairy-lights')],
      address,
      couponCode: 'diya50',
      giftMessage: 'For Nani, with love',
      discountPaise: 999999,
    });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      subtotalPaise: 24900,
      deliveryFeePaise: 2900,
      discountPaise: 5000,
      totalPaise: 22800,
      couponCode: 'DIYA50',
      giftMessage: 'For Nani, with love',
    });
  });

  it('rejects an order whose coupon does not apply, without touching stock', async () => {
    const { agent } = await signedInAgent();
    const before = await productBySlug('sparklers');
    const res = await agent.post('/api/orders').send({ items: [await line('sparklers')], address, couponCode: 'LAKSHMI100' });
    expect(res.status).toBe(400);
    expect((await productBySlug('sparklers')).stock).toBe(before.stock);
  });
});

describe('spin the wheel and rewards', () => {
  async function deliveredOrder(agent: Awaited<ReturnType<typeof signedInAgent>>['agent']) {
    const created = await agent.post('/api/orders').send({ items: [await line('kaju-katli')], address });
    return created.body.order.id as string;
  }

  it('only spins once an order is delivered, exactly once per order', async () => {
    const { agent } = await signedInAgent();
    const id = await deliveredOrder(agent);
    const early = await agent.post(`/api/orders/${id}/spin`);
    expect(early.status).toBe(409);
    expect(early.body.error).toMatch(/unlocks/);

    await waitForDelivery();
    const spins = await Promise.all([agent.post(`/api/orders/${id}/spin`), agent.post(`/api/orders/${id}/spin`)]);
    const statuses = spins.map((s) => s.status).sort();
    expect(statuses).toEqual([201, 409]);
    const won = spins.find((s) => s.status === 201)!.body;
    expect(won.prizeIndex).toBeGreaterThanOrEqual(0);
    expect(won.prizeIndex).toBeLessThan(8);
    expect(won.reward.code).toMatch(/^SHUBH-[A-Z0-9]{6}$/);
    expect(new Date(won.reward.expiresAt).getTime() - Date.now()).toBeGreaterThan(29 * 24 * 3600 * 1000);

    const again = await agent.post(`/api/orders/${id}/spin`);
    expect(again.status).toBe(409);
    expect(again.body.details.reward.code).toBe(won.reward.code);

    const order = await agent.get(`/api/orders/${id}`);
    expect(order.body.order.reward.code).toBe(won.reward.code);

    const mine = await agent.get('/api/rewards');
    expect(mine.body.rewards).toHaveLength(1);
    expect(mine.body.unused).toBe(1);
  });

  it('redeems a reward exactly once, only for its owner', async () => {
    const { agent } = await signedInAgent();
    const stranger = await signedInAgent();
    const id = await deliveredOrder(agent);
    await waitForDelivery();
    const spin = await agent.post(`/api/orders/${id}/spin`);
    const code = spin.body.reward.code as string;
    // Make the prize deterministic for the arithmetic below.
    await db.update(rewards).set({ kind: 'flat', value: 2500, minSubtotalPaise: 0, maxDiscountPaise: null }).where(eq(rewards.code, code));

    const items = [await line('fairy-lights')];
    const notYours = await stranger.agent.post('/api/orders').send({ items, address, couponCode: code });
    expect(notYours.status).toBe(400);
    const anon = await request(app).post('/api/coupons/validate').send({ code, items });
    expect(anon.status).toBe(400);

    const preview = await agent.post('/api/coupons/validate').send({ code: code.toLowerCase(), items });
    expect(preview.body).toMatchObject({ source: 'reward', discountPaise: 2500 });

    const first = await agent.post('/api/orders').send({ items, address, couponCode: code });
    expect(first.status).toBe(201);
    expect(first.body.order).toMatchObject({ discountPaise: 2500, couponCode: code, totalPaise: 24900 + 2900 - 2500 });

    const second = await agent.post('/api/orders').send({ items, address, couponCode: code });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/already been used/);

    const mine = await agent.get('/api/rewards');
    expect(mine.body.rewards[0]).toMatchObject({ code, used: true });
    expect(mine.body.unused).toBe(0);
  });

  it('two concurrent orders cannot both redeem one reward', async () => {
    const { agent } = await signedInAgent();
    const id = await deliveredOrder(agent);
    await waitForDelivery();
    const code = (await agent.post(`/api/orders/${id}/spin`)).body.reward.code as string;
    await db.update(rewards).set({ kind: 'flat', value: 1000, minSubtotalPaise: 0, maxDiscountPaise: null }).where(eq(rewards.code, code));
    const body = { items: [await line('clay-diyas')], address, couponCode: code };
    const results = await Promise.all([agent.post('/api/orders').send(body), agent.post('/api/orders').send(body)]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
  });
});

describe('diya wall', () => {
  it('lights a diya and lists it with a count', async () => {
    const before = (await request(app).get('/api/diyas')).body.count as number;
    const res = await request(app).post('/api/diyas').send({ name: 'Zoya', message: 'Light for everyone in Lucknow' });
    expect(res.status).toBe(201);
    expect(res.body.diya).toMatchObject({ name: 'Zoya', message: 'Light for everyone in Lucknow' });
    const list = await request(app).get('/api/diyas');
    expect(list.body.count).toBe(before + 1);
    expect(list.body.diyas[0].name).toBe('Zoya');
  });

  it('validates name (≤30) and message (≤80)', async () => {
    const res = await request(app).post('/api/diyas').send({ name: 'n'.repeat(31), message: 'm'.repeat(81) });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['message', 'name']);
    const blank = await request(app).post('/api/diyas').send({ name: '   ', message: '' });
    expect(blank.status).toBe(400);
  });
});

describe('rangoli', () => {
  const stroke = { c: 3, w: 8, p: [0, 0, 100, 200, -300, 400] };

  it('saves, lists and replays a rangoli by slug with a view count', async () => {
    const res = await request(app).post('/api/rangolis').send({ name: 'Lotus', folds: 8, mirror: true, strokes: [stroke] });
    expect(res.status).toBe(201);
    const slug = res.body.rangoli.slug;
    expect(slug).toMatch(/^[A-Za-z0-9_-]{8}$/);
    const one = await request(app).get(`/api/rangolis/${slug}`);
    expect(one.body.rangoli).toMatchObject({ name: 'Lotus', folds: 8, mirror: true, strokes: [stroke], views: 1 });
    const list = await request(app).get('/api/rangolis');
    expect(list.body.rangolis[0].slug).toBe(slug);
    expect((await request(app).get('/api/rangolis/AAAAAAAA')).status).toBe(404);
  });

  it('enforces folds, colours, coordinates and size limits', async () => {
    const post = (body: object) => request(app).post('/api/rangolis').send({ name: 'Test', folds: 8, strokes: [stroke], ...body });
    expect((await post({ folds: 7 })).status).toBe(400);
    expect((await post({ strokes: [{ ...stroke, c: 12 }] })).status).toBe(400);
    expect((await post({ strokes: [{ ...stroke, p: [0, 0, 1001, 0] }] })).status).toBe(400);
    expect((await post({ strokes: [{ ...stroke, p: [0, 0, 1] }] })).status).toBe(400);
    expect((await post({ strokes: [] })).status).toBe(400);
    expect((await post({ strokes: Array.from({ length: 301 }, () => stroke) })).status).toBe(400);
    const dense = { c: 1, w: 4, p: Array.from({ length: 1200 }, (_, i) => (i % 1000) - 500) };
    expect((await post({ strokes: Array.from({ length: 21 }, () => dense) })).status).toBe(400);
    expect((await post({ folds: 16, mirror: false })).status).toBe(201);
  });
});
