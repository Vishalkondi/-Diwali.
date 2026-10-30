import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

export const migrationsFolder = resolve(import.meta.dirname, '../../drizzle');

export async function runMigrations() {
  await migrate(db, { migrationsFolder });
}

/** Fails fast with a readable message (host and database only, never the password). */
export async function checkConnection() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  const where = `${url.hostname}${url.pathname}`;
  try {
    await db.execute(sql`select 1`);
    console.log(`Connected to ${where}.`);
  } catch (err) {
    throw new Error(`Could not connect to ${where}: ${(err as Error).message}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  checkConnection()
    .then(runMigrations)
    .then(() => console.log('Migrations applied.'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
