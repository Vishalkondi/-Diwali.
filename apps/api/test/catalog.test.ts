import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, signedInAgent } from './helpers.js';

describe('catalog', () => {
  it('reports health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('lists the eight categories in order', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories.map((c: { slug: string }) => c.slug)).toEqual([
      'diyas', 'rangoli', 'lights', 'sweets', 'gifts', 'puja', 'torans', 'sparklers',
    ]);
    expect(res.body.categories[0]).toMatchObject({ name: 'Diyas', icon: 'diya' });
  });

  it('lists every product with its category', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(26);
    const diyas = res.body.products.find((p: { slug: string }) => p.slug === 'clay-diyas');
    expect(diyas).toMatchObject({ name: 'Clay Diyas', pricePaise: 14900, badge: 'Bestseller', category: { slug: 'diyas', icon: 'diya' } });
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/products?category=sweets');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    for (const p of res.body.products) expect(p.category.slug).toBe('sweets');
  });

  it('searches names and subtitles case-insensitively', async () => {
    const res = await request(app).get('/api/products?q=KAJU');
    // matches the product name and the hamper whose subtitle mentions it
    expect(res.body.products.map((p: { slug: string }) => p.slug)).toEqual(['kaju-katli', 'lakshmi-hamper']);
    const sub = await request(app).get('/api/products?q=phuljhadi');
    expect(sub.body.products.map((p: { slug: string }) => p.slug)).toEqual(['sparklers']);
  });

  it('treats LIKE wildcards in search literally', async () => {
    const pct = await request(app).get('/api/products').query({ q: '%' });
    expect(pct.body.products).toEqual([]);
    const under = await request(app).get('/api/products').query({ q: '_' });
    expect(under.body.products).toEqual([]);
  });

  it('combines category and search', async () => {
    const res = await request(app).get('/api/products?category=gifts&q=hamper');
    expect(res.body.products.length).toBe(4);
  });

  it('returns an empty list for an unknown category', async () => {
    const res = await request(app).get('/api/products?category=nope');
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
  });

  it('gets a product by slug and 404s for unknown slugs', async () => {
    const ok = await request(app).get('/api/products/fairy-lights');
    expect(ok.status).toBe(200);
    expect(ok.body.product.pricePaise).toBe(24900);
    const missing = await request(app).get('/api/products/no-such-thing');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: expect.any(String) });
  });

  it('404s unknown API routes with the standard error shape', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTypeOf('string');
  });
});

describe('catalog sorting and filters', () => {
  const prices = (res: request.Response) => res.body.products.map((p: { pricePaise: number }) => p.pricePaise);

  it('sorts by price both ways', async () => {
    const asc = prices(await request(app).get('/api/products?sort=price_asc'));
    expect(asc).toEqual([...asc].sort((a: number, b: number) => a - b));
    const desc = prices(await request(app).get('/api/products?sort=price_desc'));
    expect(desc).toEqual([...desc].sort((a: number, b: number) => b - a));
  });

  it('filters by a price range in rupees, inclusive', async () => {
    const res = await request(app).get('/api/products?minPrice=200&maxPrice=499');
    expect(res.body.products.length).toBeGreaterThan(0);
    for (const p of prices(res)) expect(p >= 20000 && p <= 49900).toBe(true);
  });

  it('puts rated products first when sorting by rating', async () => {
    const res = await request(app).get('/api/products?sort=rating');
    const ratings: (number | null)[] = res.body.products.map((p: { rating: number | null }) => p.rating);
    const firstUnrated = ratings.indexOf(null);
    expect(firstUnrated).toBeGreaterThan(0);
    expect(ratings.slice(firstUnrated).every((r) => r === null)).toBe(true);
  });

  it('rejects an unknown sort', async () => {
    const res = await request(app).get('/api/products?sort=cheapest');
    expect(res.status).toBe(400);
    expect(res.body.details.sort).toBeTypeOf('string');
  });

  it('returns a description and related products on the detail endpoint', async () => {
    const res = await request(app).get('/api/products/clay-diyas');
    expect(res.body.product.description).toMatch(/terracotta/);
    expect(res.body.related.length).toBeGreaterThan(0);
    for (const p of res.body.related) {
      expect(p.category.slug).toBe('diyas');
      expect(p.slug).not.toBe('clay-diyas');
    }
  });
});

describe('reviews', () => {
  it('lists seeded reviews with a summary', async () => {
    const res = await request(app).get('/api/products/kaju-katli/reviews');
    expect(res.status).toBe(200);
    expect(res.body.summary.count).toBe(res.body.reviews.length);
    expect(res.body.summary.histogram.reduce((a: number, b: number) => a + b, 0)).toBe(res.body.summary.count);
    expect(res.body.reviews[0]).toMatchObject({ name: expect.any(String), mine: false });
  });

  it('needs a signed-in user to write one', async () => {
    const res = await request(app).put('/api/products/soan-papdi/reviews/mine').send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it('validates the rating', async () => {
    const { agent } = await signedInAgent();
    const res = await agent.put('/api/products/soan-papdi/reviews/mine').send({ rating: 6 });
    expect(res.status).toBe(400);
    expect(res.body.details.rating).toBeTypeOf('string');
  });

  it('creates, edits and deletes your own review, and updates the product rating', async () => {
    const { agent } = await signedInAgent('Meera Iyer');
    const created = await agent.put('/api/products/soan-papdi/reviews/mine').send({ rating: 2, body: 'Too dry.' });
    expect(created.status).toBe(200);
    const edited = await agent.put('/api/products/soan-papdi/reviews/mine').send({ rating: 4, body: 'Better the next day.' });
    expect(edited.body.review.id).toBe(created.body.review.id);

    const list = await agent.get('/api/products/soan-papdi/reviews');
    const mine = list.body.reviews.filter((r: { mine: boolean }) => r.mine);
    expect(mine).toEqual([expect.objectContaining({ rating: 4, body: 'Better the next day.', name: 'Meera Iyer', verified: false })]);
    const product = await request(app).get('/api/products/soan-papdi');
    expect(product.body.product.ratingCount).toBeGreaterThanOrEqual(1);

    expect((await agent.delete('/api/products/soan-papdi/reviews/mine')).status).toBe(204);
    const after = await agent.get('/api/products/soan-papdi/reviews');
    expect(after.body.reviews.some((r: { mine: boolean }) => r.mine)).toBe(false);
  });

  it('404s reviews for an unknown product', async () => {
    const res = await request(app).get('/api/products/no-such-thing/reviews');
    expect(res.status).toBe(404);
  });
});
