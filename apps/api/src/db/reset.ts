import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import { runMigrations } from './migrate.js';
import { seed } from './seed.js';

/** Drops everything, re-applies migrations and seeds. Development and tests only. */
export async function resetDatabase() {
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await runMigrations();
  await seed();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to reset a production database.');
    process.exit(1);
  }
  resetDatabase()
    .then(() => console.log('Database reset, migrated and seeded.'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
