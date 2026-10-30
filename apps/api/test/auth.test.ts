import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, uniqueEmail } from './helpers.js';

const sessionCookie = (res: request.Response) => {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith('dd_session='));
};

describe('auth', () => {
  it('validates registration fields with per-field details', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf('string');
    expect(Object.keys(res.body.details).sort()).toEqual(['email', 'name', 'password']);
  });

  it('registers, sets a secure-by-default session cookie and never returns the hash', async () => {
    const email = uniqueEmail();
    const res = await request(app).post('/api/auth/register').send({ name: 'Meera Iyer', email, password: 'lakshmi-puja' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Meera Iyer', email });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);

    const cookie = sessionCookie(res)!;
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=604800/);
    // secure only in production
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it('rejects a duplicate email, regardless of case', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Ravi', email, password: 'rangoli-123' });
    const dup = await request(app).post('/api/auth/register').send({ name: 'Ravi', email: email.toUpperCase(), password: 'rangoli-123' });
    expect(dup.status).toBe(409);
    expect(dup.body.details.email).toBeTypeOf('string');
  });

  it('logs in case-insensitively and reports the user from /me', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Kavya', email, password: 'diya-diya-1' });

    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: `  ${email.toUpperCase()} `, password: 'diya-diya-1' });
    expect(login.status).toBe(200);
    expect(sessionCookie(login)).toBeDefined();

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it('gives the same generic failure for a wrong password and an unknown email', async () => {
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ name: 'Kabir', email, password: 'correct-horse' });
    const wrong = await request(app).post('/api/auth/login').send({ email, password: 'wrong-horse' });
    const unknown = await request(app).post('/api/auth/login').send({ email: uniqueEmail(), password: 'wrong-horse' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
    expect(sessionCookie(wrong)).toBeUndefined();
  });

  it('returns { user: null } (not 401) when signed out', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it('ignores a tampered session cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'dd_session=eyJhbGciOiJub25lIn0.e30.');
    expect(res.body).toEqual({ user: null });
  });

  it('logs out by clearing the cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'Ishaan', email: uniqueEmail(), password: 'phuljhadi-9' });
    expect((await agent.get('/api/auth/me')).body.user).not.toBeNull();
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(sessionCookie(out)).toMatch(/dd_session=;/);
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
  });
});
