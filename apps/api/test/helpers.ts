import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/client.js';
import { products } from '../src/db/schema.js';

export const app = createApp();

export const uniqueEmail = () => `tester-${randomUUID().slice(0, 8)}@example.com`;

/** A supertest agent that keeps cookies, already registered and signed in. */
export async function signedInAgent(name = 'Asha Rao') {
  const agent = request.agent(app);
  const email = uniqueEmail();
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'diwali-2026' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, email, user: res.body.user as { id: string } };
}

export async function productBySlug(slug: string) {
  const [p] = await db.select().from(products).where(eq(products.slug, slug));
  if (!p) throw new Error(`no product ${slug}`);
  return p;
}

export const address = { flat: '402', society: 'Lotus Residency, Baner', city: 'Pune' };

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits until the fast test clock has delivered an order. */
export const waitForDelivery = () => sleep(1700);
