import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load the repo-root .env without overriding variables already set (tests, CI, hosts).
try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../../.env'));
} catch {
  // No .env file: rely on the real environment.
}

// On Vercel, a missing JWT_SECRET is derived from DATABASE_URL: it already holds the database
// password, never leaves the server, and is identical on every instance. Set JWT_SECRET to override.
if (process.env.VERCEL && !process.env.JWT_SECRET && process.env.DATABASE_URL) {
  process.env.JWT_SECRET = createHash('sha256').update(`utsavly-session:${process.env.DATABASE_URL}`).digest('base64url');
}

const seconds = (fallback: number) => z.coerce.number().positive().default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FULFIL_PLACED_SECONDS: seconds(6),
  FULFIL_PACKING_SECONDS: seconds(10),
  FULFIL_ON_THE_WAY_SECONDS: seconds(18),
  STREAM_TICK_MS: z.coerce.number().int().positive().default(1000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
