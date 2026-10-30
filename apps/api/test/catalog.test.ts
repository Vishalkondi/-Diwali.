import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './helpers.js';

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
