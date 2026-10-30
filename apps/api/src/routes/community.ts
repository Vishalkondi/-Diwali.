import { desc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db/client.js';
import { diyas, rangolis, wishes } from '../db/schema.js';
import { isTest } from '../env.js';
import { optionalAuth } from '../lib/auth.js';
import { notFound, parse } from '../lib/http.js';
import { withFreshSlug } from '../lib/slug.js';

export const communityRouter = Router();

const writeLimiter = (limit: number) =>
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: 'You’re lighting things up fast! Please wait a few minutes and try again.' },
  });

const slugParam = z.string().regex(/^[A-Za-z0-9_-]{8,16}$/);

/* ---------- Wishes ---------- */

const name = (label: string, max: number) =>
  z.string().trim().min(1, `Add ${label}.`).max(max, `Keep it under ${max} characters.`);

const wishBody = z.object({
  toName: name('who it’s for', 40),
  fromName: name('your name', 40),
  message: z.string().trim().min(1, 'Write a short message.').max(240, 'Keep the message under 240 characters.'),
  theme: z.enum(['diya', 'rangoli', 'fireworks']).default('diya'),
  lang: z.enum(['en', 'hi', 'mr']).default('en'),
});

const wishCols = {
  slug: wishes.slug,
  toName: wishes.toName,
  fromName: wishes.fromName,
  message: wishes.message,
  theme: wishes.theme,
  lang: wishes.lang,
  views: wishes.views,
  createdAt: wishes.createdAt,
};

communityRouter.post('/wishes', optionalAuth, writeLimiter(30), async (req, res) => {
  const body = parse(wishBody, req.body);
  const wish = await withFreshSlug(async (slug) => {
    const [row] = await db
      .insert(wishes)
      .values({ ...body, slug, userId: req.userId ?? null })
      .returning(wishCols);
    return row!;
  });
  res.status(201).json({ wish });
});

communityRouter.get('/wishes/:slug', async (req, res) => {
  const slug = slugParam.safeParse(req.params.slug);
  if (!slug.success) throw notFound('This wish could not be found.');
  // Atomic increment: concurrent openers never lose a view.
  const [wish] = await db
    .update(wishes)
    .set({ views: sql`${wishes.views} + 1` })
    .where(eq(wishes.slug, slug.data))
    .returning(wishCols);
  if (!wish) throw notFound('This wish could not be found.');
  res.json({ wish });
});

/* ---------- Diya Wall ---------- */

const diyaBody = z.object({
  name: z.string().trim().min(1, 'Add your name.').max(30, 'Keep your name under 30 characters.'),
  message: z.string().trim().min(1, 'Write a short wish.').max(80, 'Keep the wish under 80 characters.'),
});

communityRouter.get('/diyas', async (_req, res) => {
  const [rows, [total]] = await Promise.all([
    db.select().from(diyas).orderBy(desc(diyas.id)).limit(300),
    db.select({ n: sql<number>`count(*)::int` }).from(diyas),
  ]);
  res.json({ count: total?.n ?? 0, diyas: rows });
});

communityRouter.post('/diyas', writeLimiter(10), async (req, res) => {
  const body = parse(diyaBody, req.body);
  const [diya] = await db.insert(diyas).values(body).returning();
  res.status(201).json({ diya });
});

/* ---------- Rangoli ---------- */

export const RANGOLI_LIMITS = { strokes: 300, pointsPerStroke: 600, totalPoints: 12000 } as const;

const coord = z.number().int().min(-1000).max(1000);
const stroke = z.object({
  c: z.number().int().min(0).max(11),
  w: z.number().min(1).max(60),
  p: z
    .array(coord)
    .min(2)
    .max(RANGOLI_LIMITS.pointsPerStroke * 2)
    .refine((p) => p.length % 2 === 0, 'Points come in x,y pairs.'),
});

const rangoliBody = z.object({
  name: z.string().trim().min(1, 'Give your rangoli a name.').max(40, 'Keep the name under 40 characters.'),
  folds: z.union([z.literal(6), z.literal(8), z.literal(12), z.literal(16)]),
  mirror: z.boolean().default(true),
  strokes: z
    .array(stroke)
    .min(1, 'Draw something first!')
    .max(RANGOLI_LIMITS.strokes, `Up to ${RANGOLI_LIMITS.strokes} strokes per rangoli.`)
    .refine(
      (s) => s.reduce((n, st) => n + st.p.length / 2, 0) <= RANGOLI_LIMITS.totalPoints,
      `That drawing is too detailed (max ${RANGOLI_LIMITS.totalPoints} points).`,
    ),
});

const rangoliSummary = {
  slug: rangolis.slug,
  name: rangolis.name,
  folds: rangolis.folds,
  mirror: rangolis.mirror,
  views: rangolis.views,
  createdAt: rangolis.createdAt,
};

communityRouter.get('/rangolis', async (_req, res) => {
  // The gallery draws thumbnails, so it needs strokes too; keep it to the latest 24.
  const rows = await db
    .select({ ...rangoliSummary, strokes: rangolis.strokes })
    .from(rangolis)
    .orderBy(desc(rangolis.createdAt))
    .limit(24);
  res.json({ rangolis: rows });
});

communityRouter.post('/rangolis', writeLimiter(20), async (req, res) => {
  const body = parse(rangoliBody, req.body);
  const rangoli = await withFreshSlug(async (slug) => {
    const [row] = await db.insert(rangolis).values({ ...body, slug }).returning(rangoliSummary);
    return row!;
  });
  res.status(201).json({ rangoli });
});

communityRouter.get('/rangolis/:slug', async (req, res) => {
  const slug = slugParam.safeParse(req.params.slug);
  if (!slug.success) throw notFound('This rangoli could not be found.');
  const [rangoli] = await db
    .update(rangolis)
    .set({ views: sql`${rangolis.views} + 1` })
    .where(eq(rangolis.slug, slug.data))
    .returning({ ...rangoliSummary, strokes: rangolis.strokes });
  if (!rangoli) throw notFound('This rangoli could not be found.');
  res.json({ rangoli });
});
