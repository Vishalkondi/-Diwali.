import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { categories, orderItems, orders, products, reviews, users } from '../db/schema.js';
import { optionalAuth, requireAuth, userIdOf } from '../lib/auth.js';
import { notFound, parse } from '../lib/http.js';
import { escapeLike } from '../lib/slug.js';

export const catalogRouter = Router();

catalogRouter.get('/categories', async (_req, res) => {
  const rows = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name, icon: categories.icon, tint: categories.tint })
    .from(categories)
    .orderBy(asc(categories.sortOrder));
  res.json({ categories: rows });
});

// Per-product aggregates, joined onto every product query.
const ratings = db
  .select({
    productId: reviews.productId,
    avg: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`.as('rating_avg'),
    count: sql<number>`count(*)::int`.as('rating_count'),
  })
  .from(reviews)
  .groupBy(reviews.productId)
  .as('ratings');

const sales = db
  .select({ productId: orderItems.productId, sold: sql<number>`sum(${orderItems.qty})::int`.as('sold') })
  .from(orderItems)
  .groupBy(orderItems.productId)
  .as('sales');

const ratingAvg = sql<number | null>`${ratings.avg}`;
const ratingCount = sql<number>`coalesce(${ratings.count}, 0)`;
const sold = sql<number>`coalesce(${sales.sold}, 0)`;

const productCols = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  subtitle: products.subtitle,
  pricePaise: products.pricePaise,
  stock: products.stock,
  badge: products.badge,
  rating: ratingAvg,
  ratingCount,
  category: { slug: categories.slug, name: categories.name, icon: categories.icon, tint: categories.tint },
};

const productQuery = () =>
  db
    .select({ ...productCols, description: products.description, categoryId: products.categoryId })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(ratings, eq(ratings.productId, products.id))
    .leftJoin(sales, eq(sales.productId, products.id));

type ProductRow = Awaited<ReturnType<typeof productQuery>>[number];
/** Lists leave out the long description and the internal category id. */
const listItem = ({ description: _d, categoryId: _c, ...p }: ProductRow) => p;

const SORTS = {
  featured: [asc(categories.sortOrder), asc(products.id)],
  price_asc: [asc(products.pricePaise), asc(products.id)],
  price_desc: [desc(products.pricePaise), asc(products.id)],
  rating: [sql`${ratings.avg} desc nulls last`, desc(ratingCount), asc(products.id)],
  popular: [desc(sold), desc(ratingCount), asc(products.id)],
} satisfies Record<string, SQL[]>;

const rupees = z.coerce.number().int().min(0).max(100_000);

const listQuery = z.object({
  category: z.string().trim().max(40).optional(),
  q: z.string().trim().max(60).optional(),
  sort: z.enum(Object.keys(SORTS) as [keyof typeof SORTS, ...(keyof typeof SORTS)[]]).default('featured'),
  minPrice: rupees.optional(),
  maxPrice: rupees.optional(),
});

catalogRouter.get('/products', async (req, res) => {
  const { category, q, sort, minPrice, maxPrice } = parse(listQuery, req.query);
  const where: SQL[] = [];
  if (category) where.push(eq(categories.slug, category));
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where.push(or(ilike(products.name, pattern), ilike(products.subtitle, pattern), ilike(categories.name, pattern))!);
  }
  if (minPrice !== undefined) where.push(gte(products.pricePaise, minPrice * 100));
  if (maxPrice !== undefined) where.push(lte(products.pricePaise, maxPrice * 100));
  const rows = await productQuery()
    .where(where.length ? and(...where) : undefined)
    .orderBy(...SORTS[sort]);
  res.json({ products: rows.map(listItem) });
});

async function productIdBySlug(slug: string) {
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug));
  if (!row) throw notFound('We couldn’t find that product.');
  return row.id;
}

catalogRouter.get('/products/:slug', async (req, res) => {
  const [row] = await productQuery().where(eq(products.slug, req.params.slug));
  if (!row) throw notFound('We couldn’t find that product.');
  const { categoryId, ...product } = row;
  // "You may also like": the best-rated others from the same category.
  const related = await productQuery()
    .where(and(eq(products.categoryId, categoryId), sql`${products.id} <> ${product.id}`))
    .orderBy(...SORTS.rating)
    .limit(4);
  res.json({ product, related: related.map(listItem) });
});

/* ---------- Reviews ---------- */

const reviewBody = z.object({
  rating: z.number().int().min(1, 'Pick a star rating.').max(5, 'Pick a star rating.'),
  body: z.string().trim().max(400, 'Keep the review under 400 characters.').default(''),
});

// A review counts as a verified purchase when its author has ordered the product.
const verified = sql<boolean>`exists (
  select 1 from ${orderItems} join ${orders} on ${orders.id} = ${orderItems.orderId}
  where ${orderItems.productId} = ${reviews.productId} and ${orders.userId} = ${reviews.userId}
)`;

catalogRouter.get('/products/:slug/reviews', optionalAuth, async (req, res) => {
  const productId = await productIdBySlug(String(req.params.slug));
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      name: users.name,
      userId: reviews.userId,
      verified,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.updatedAt))
    .limit(100);
  const histogram = [0, 0, 0, 0, 0];
  for (const r of rows) histogram[r.rating - 1]!++;
  const count = rows.length;
  const avg = count ? Math.round((rows.reduce((n, r) => n + r.rating, 0) / count) * 10) / 10 : null;
  res.json({
    summary: { avg, count, histogram },
    reviews: rows.map(({ userId, ...r }) => ({ ...r, mine: userId === req.userId })),
  });
});

catalogRouter.put('/products/:slug/reviews/mine', requireAuth, async (req, res) => {
  const userId = userIdOf(req);
  const productId = await productIdBySlug(String(req.params.slug));
  const body = parse(reviewBody, req.body);
  const [review] = await db
    .insert(reviews)
    .values({ productId, userId, ...body })
    .onConflictDoUpdate({
      target: [reviews.productId, reviews.userId],
      set: { rating: body.rating, body: body.body, updatedAt: sql`now()` },
    })
    .returning({ id: reviews.id, rating: reviews.rating, body: reviews.body });
  res.json({ review });
});

catalogRouter.delete('/products/:slug/reviews/mine', requireAuth, async (req, res) => {
  const userId = userIdOf(req);
  const productId = await productIdBySlug(String(req.params.slug));
  await db.delete(reviews).where(and(eq(reviews.productId, productId), eq(reviews.userId, userId)));
  res.status(204).end();
});
