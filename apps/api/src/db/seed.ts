import { pathToFileURL } from 'node:url';
import { inArray, sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import { categories, coupons, products, reviews, users } from './schema.js';
import { categorySeed, couponSeed, productDescriptions, productSeed, reviewerSeed, reviewSeed } from './seed-data.js';

/** Idempotent: upserts the catalog and public coupons, and resets stock to 100. */
export async function seed() {
  await db.transaction(async (tx) => {
    const cats = await tx
      .insert(categories)
      .values(categorySeed.map((c, i) => ({ ...c, sortOrder: i })))
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: sql`excluded.name`,
          icon: sql`excluded.icon`,
          tint: sql`excluded.tint`,
          sortOrder: sql`excluded.sort_order`,
        },
      })
      .returning({ id: categories.id, slug: categories.slug });
    const catId = new Map(cats.map((c) => [c.slug, c.id]));

    await tx
      .insert(products)
      .values(
        productSeed.map((p) => ({
          slug: p.slug,
          name: p.name,
          subtitle: p.subtitle,
          description: productDescriptions[p.slug] ?? '',
          pricePaise: p.price * 100,
          categoryId: catId.get(p.category)!,
          badge: p.badge ?? null,
          stock: 100,
        })),
      )
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: sql`excluded.name`,
          subtitle: sql`excluded.subtitle`,
          description: sql`excluded.description`,
          pricePaise: sql`excluded.price_paise`,
          categoryId: sql`excluded.category_id`,
          badge: sql`excluded.badge`,
          stock: sql`excluded.stock`,
        },
      });

    // Demo reviews, so ratings and sorting have something to show. Re-seeding never duplicates them.
    await tx
      .insert(users)
      .values(reviewerSeed.map((r) => ({ ...r, passwordHash: '!demo-reviewer' })))
      .onConflictDoNothing({ target: users.email });
    const reviewers = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.email, reviewerSeed.map((r) => r.email)));
    const reviewerId = new Map(reviewers.map((r) => [r.email, r.id]));
    const productRows = await tx.select({ id: products.id, slug: products.slug }).from(products);
    const productId = new Map(productRows.map((p) => [p.slug, p.id]));
    await tx
      .insert(reviews)
      .values(
        reviewSeed.map(([slug, who, rating, body]) => ({
          productId: productId.get(slug)!,
          userId: reviewerId.get(reviewerSeed[who]!.email)!,
          rating,
          body,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(coupons)
      .values(couponSeed.map((c) => ({ ...c })))
      .onConflictDoUpdate({
        target: coupons.code,
        set: {
          description: sql`excluded.description`,
          kind: sql`excluded.kind`,
          value: sql`excluded.value`,
          minSubtotalPaise: sql`excluded.min_subtotal_paise`,
          maxDiscountPaise: sql`excluded.max_discount_paise`,
          active: sql`true`,
        },
      });
  });
  return { categories: categorySeed.length, products: productSeed.length, coupons: couponSeed.length };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  seed()
    .then((n) => console.log(`Seeded ${n.categories} categories, ${n.products} products, ${n.coupons} coupons.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
