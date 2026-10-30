import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, signedInAgent } from './helpers.js';

const wish = { toName: 'Nani', fromName: 'Aarav', message: 'May your home glow all year.', theme: 'rangoli', lang: 'hi' };

describe('wishes', () => {
  it('creates a wish anonymously with an 8-char base64url slug', async () => {
    const res = await request(app).post('/api/wishes').send(wish);
    expect(res.status).toBe(201);
    expect(res.body.wish).toMatchObject({ ...wish, views: 0 });
    expect(res.body.wish.slug).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  it('creates a wish when signed in too', async () => {
    const { agent } = await signedInAgent();
    const res = await agent.post('/api/wishes').send({ ...wish, theme: 'fireworks', lang: 'mr' });
    expect(res.status).toBe(201);
  });

  it('defaults theme and language', async () => {
    const res = await request(app).post('/api/wishes').send({ toName: 'Dad', fromName: 'Riya', message: 'Shubh Deepavali!' });
    expect(res.body.wish).toMatchObject({ theme: 'diya', lang: 'en' });
  });

  it('counts each open atomically', async () => {
    const created = await request(app).post('/api/wishes').send(wish);
    const slug = created.body.wish.slug;
    await Promise.all(Array.from({ length: 5 }, () => request(app).get(`/api/wishes/${slug}`)));
    const res = await request(app).get(`/api/wishes/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.wish.views).toBe(6);
  });

  it('404s for missing or malformed slugs', async () => {
    expect((await request(app).get('/api/wishes/AAAAAAAA')).status).toBe(404);
    expect((await request(app).get('/api/wishes/bad!')).status).toBe(404);
  });

  it('validates fields', async () => {
    const res = await request(app)
      .post('/api/wishes')
      .send({ toName: '', fromName: 'x'.repeat(41), message: 'y'.repeat(241), theme: 'confetti', lang: 'fr' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['fromName', 'lang', 'message', 'theme', 'toName']);
  });
});
