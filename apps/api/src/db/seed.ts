import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import { categories, coupons, products } from './schema.js';
import { categorySeed, couponSeed, productSeed } from './seed-data.js';

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
          pricePaise: sql`excluded.price_paise`,
          categoryId: sql`excluded.category_id`,
          badge: sql`excluded.badge`,
          stock: sql`excluded.stock`,
        },
      });

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
