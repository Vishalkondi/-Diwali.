import { eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { db } from '../src/db/client.js';
import { orders, products } from '../src/db/schema.js';
import { address, app, productBySlug, signedInAgent, sleep, waitForDelivery } from './helpers.js';

// Collects a server-sent-events response as one string.
const readStream = (r: request.Response, cb: (err: Error | null, body: string) => void) => {
  let data = '';
  r.on('data', (chunk: Buffer | string) => (data += chunk.toString()));
  r.on('end', () => cb(null, data));
};

describe('orders', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401);
    expect((await request(app).post('/api/orders').send({})).status).toBe(401);
  });

  it('validates the body', async () => {
    const { agent } = await signedInAgent();
    const empty = await agent.post('/api/orders').send({ items: [], address });
    expect(empty.status).toBe(400);
    expect(empty.body.details.items).toBeTypeOf('string');

    const bad = await agent
      .post('/api/orders')
      .send({ items: [{ productId: 1, qty: 0 }], address: { flat: '', society: 'x', city: '' } });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.details)).toEqual(
      expect.arrayContaining(['items.0.qty', 'address.flat', 'address.society', 'address.city']),
    );

    const unknown = await agent.post('/api/orders').send({ items: [{ productId: 999999, qty: 1 }], address });
    expect(unknown.status).toBe(400);
  });

  it('prices on the server, ignores client totals and charges ₹29 delivery under ₹499', async () => {
    const { agent } = await signedInAgent();
    const kaju = await productBySlug('kaju-katli'); // ₹199
    const res = await agent.post('/api/orders').send({
      items: [{ productId: kaju.id, qty: 1, pricePaise: 1 }],
      address,
      subtotalPaise: 1,
      totalPaise: 1,
      deliveryFeePaise: 0,
    });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({
      status: 'placed',
      subtotalPaise: 19900,
      deliveryFeePaise: 2900,
      discountPaise: 0,
      totalPaise: 22800,
      address,
    });
    expect(res.body.order.items).toEqual([
      expect.objectContaining({ productId: kaju.id, name: 'Kaju Katli', pricePaise: 19900, qty: 1 }),
    ]);
  });

  it('merges duplicate lines and makes delivery free from ₹499', async () => {
    const { agent } = await signedInAgent();
    const lights = await productBySlug('fairy-lights'); // ₹249
    const res = await agent.post('/api/orders').send({
      items: [
        { productId: lights.id, qty: 1 },
        { productId: lights.id, qty: 2 },
      ],
      address,
    });
    expect(res.status).toBe(201);
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.order.items[0].qty).toBe(3);
    expect(res.body.order.subtotalPaise).toBe(74700);
    expect(res.body.order.deliveryFeePaise).toBe(0);
    expect(res.body.order.totalPaise).toBe(74700);
  });

  it('applies the delivery-fee rule on both sides of the threshold', async () => {
    const { agent } = await signedInAgent();
    const toran = await productBySlug('marigold-toran'); // ₹129
    const diyas = await productBySlug('clay-diyas'); // ₹149
    const under = await agent
      .post('/api/orders')
      .send({ items: [{ productId: toran.id, qty: 1 }, { productId: diyas.id, qty: 2 }], address }); // ₹427
    expect(under.body.order.deliveryFeePaise).toBe(2900);
    expect(under.body.order.totalPaise).toBe(42700 + 2900);
    const idol = await productBySlug('lakshmi-ganesh-idol'); // ₹899
    const over = await agent.post('/api/orders').send({ items: [{ productId: idol.id, qty: 1 }], address });
    expect(over.body.order.deliveryFeePaise).toBe(0);
  });

  it('decrements stock', async () => {
    const { agent } = await signedInAgent();
    const before = await productBySlug('soan-papdi');
    const res = await agent.post('/api/orders').send({ items: [{ productId: before.id, qty: 3 }], address });
    expect(res.status).toBe(201);
    expect((await productBySlug('soan-papdi')).stock).toBe(before.stock - 3);
  });

  it('refuses to oversell with a friendly 409 and leaves every stock count untouched', async () => {
    const { agent } = await signedInAgent();
    const scarce = await productBySlug('brass-akhand-diya');
    const other = await productBySlug('agarbatti-bundle');
    await db.update(products).set({ stock: 2 }).where(eq(products.id, scarce.id));
    const otherBefore = other.stock;

    const res = await agent.post('/api/orders').send({
      items: [
        { productId: other.id, qty: 1 },
        { productId: scarce.id, qty: 3 },
      ],
      address,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Only 2 Brass Akhand Diya left/);
    expect((await productBySlug('brass-akhand-diya')).stock).toBe(2);
    expect((await productBySlug('agarbatti-bundle')).stock).toBe(otherBefore);
    expect((await agent.get('/api/orders')).body.orders).toEqual([]);
    await db.update(products).set({ stock: 100 }).where(eq(products.id, scarce.id));
  });

  it('never oversells under concurrent orders', async () => {
    const a = await signedInAgent();
    const b = await signedInAgent();
    const p = await productBySlug('beaded-bandhanwar');
    await db.update(products).set({ stock: 1 }).where(eq(products.id, p.id));
    const body = { items: [{ productId: p.id, qty: 1 }], address };
    const results = await Promise.all([a.agent.post('/api/orders').send(body), b.agent.post('/api/orders').send(body)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await productBySlug('beaded-bandhanwar')).stock).toBe(0);
    await db.update(products).set({ stock: 100 }).where(eq(products.id, p.id));
  });

  it('progresses through every stage on the fast clock and persists it lazily', async () => {
    const { agent } = await signedInAgent();
    const p = await productBySlug('sparklers');
    const created = await agent.post('/api/orders').send({ items: [{ productId: p.id, qty: 1 }], address });
    const id = created.body.order.id as string;
    expect(created.body.order.tracking).toMatchObject({ status: 'placed', totalSeconds: 1.5 });

    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = await agent.get(`/api/orders/${id}`);
      if (seen.at(-1) !== r.body.order.status) seen.push(r.body.order.status);
      if (r.body.order.status === 'delivered') break;
      await sleep(80);
    }
    expect(seen).toEqual(['placed', 'packing', 'on_the_way', 'delivered']);

    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row!.status).toBe('delivered');
    expect(row!.deliveredAt).toBeInstanceOf(Date);

    const list = await agent.get('/api/orders');
    expect(list.body.orders[0]).toMatchObject({ id, status: 'delivered' });
  });

  it('keeps orders private: other users and malformed ids get 404', async () => {
    const owner = await signedInAgent();
    const stranger = await signedInAgent();
    const p = await productBySlug('rangoli-colours');
    const created = await owner.agent.post('/api/orders').send({ items: [{ productId: p.id, qty: 1 }], address });
    const id = created.body.order.id;

    expect((await owner.agent.get(`/api/orders/${id}`)).status).toBe(200);
    expect((await stranger.agent.get(`/api/orders/${id}`)).status).toBe(404);
    expect((await stranger.agent.get(`/api/orders/${id}/stream`)).status).toBe(404);
    expect((await stranger.agent.post(`/api/orders/${id}/spin`)).status).toBe(404);
    expect((await stranger.agent.get('/api/orders')).body.orders).toEqual([]);
    expect((await owner.agent.get('/api/orders/not-a-uuid')).status).toBe(404);
    expect((await owner.agent.get('/api/orders/00000000-0000-0000-0000-000000000000')).status).toBe(404);
  });

  it('streams tracking ticks over SSE and closes once delivered', async () => {
    const { agent } = await signedInAgent();
    const p = await productBySlug('clay-diyas');
    const created = await agent.post('/api/orders').send({ items: [{ productId: p.id, qty: 1 }], address });

    const res = await agent.get(`/api/orders/${created.body.order.id}/stream`).buffer(true).parse(readStream);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    const text = res.body as string;
    const ticks = text
      .split('\n\n')
      .filter((block) => block.startsWith('data: '))
      .map((block) => JSON.parse(block.slice(6)));
    expect(ticks.length).toBeGreaterThan(3);
    for (const t of ticks) {
      expect(Object.keys(t).sort()).toEqual(['elapsedSeconds', 'etaSeconds', 'progress', 'stageProgress', 'status', 'totalSeconds']);
    }
    expect(ticks.at(-1)).toMatchObject({ status: 'delivered', progress: 1, etaSeconds: 0 });
    expect(new Set(ticks.map((t) => t.status)).size).toBeGreaterThanOrEqual(3);
    expect(text).toContain('event: end');
  });

  it('streams a single delivered tick for an order that has already arrived', async () => {
    const { agent } = await signedInAgent();
    const p = await productBySlug('clay-diyas');
    const created = await agent.post('/api/orders').send({ items: [{ productId: p.id, qty: 1 }], address });
    await waitForDelivery();
    const res = await agent.get(`/api/orders/${created.body.order.id}/stream`).buffer(true).parse(readStream);
    const ticks = (res.body as string).split('\n\n').filter((b) => b.startsWith('data: {"'));
    expect(ticks).toHaveLength(1);
    expect(ticks[0]).toMatch(/"status":"delivered"/);
  });
});
