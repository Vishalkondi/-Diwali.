import { and, asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { categories, products } from '../db/schema.js';
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

const productCols = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  subtitle: products.subtitle,
  pricePaise: products.pricePaise,
  stock: products.stock,
  badge: products.badge,
  category: { slug: categories.slug, name: categories.name, icon: categories.icon, tint: categories.tint },
};

const listQuery = z.object({
  category: z.string().trim().max(40).optional(),
  q: z.string().trim().max(60).optional(),
});

catalogRouter.get('/products', async (req, res) => {
  const { category, q } = parse(listQuery, req.query);
  const where: SQL[] = [];
  if (category) where.push(eq(categories.slug, category));
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    where.push(or(ilike(products.name, pattern), ilike(products.subtitle, pattern), ilike(categories.name, pattern))!);
  }
  const rows = await db
    .select(productCols)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(categories.sortOrder), asc(products.id));
  res.json({ products: rows });
});

catalogRouter.get('/products/:slug', async (req, res) => {
  const [row] = await db
    .select(productCols)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, req.params.slug));
  if (!row) throw notFound('We couldn’t find that product.');
  res.json({ product: row });
});
