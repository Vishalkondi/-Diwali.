import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../.env'));
} catch {
  // fall back to the real environment
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
