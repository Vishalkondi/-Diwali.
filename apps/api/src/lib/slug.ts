import { randomBytes } from 'node:crypto';

/** 8 URL-safe characters (6 random bytes, base64url). */
export const randomSlug = () => randomBytes(6).toString('base64url');

/** Postgres unique-violation check, for retrying slug collisions. */
export function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

/** Retries `insert` with a fresh slug if it ever collides. */
export async function withFreshSlug<T>(insert: (slug: string) => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await insert(randomSlug());
    } catch (err) {
      if (!isUniqueViolation(err) || i >= attempts - 1) throw err;
    }
  }
}

/** Escapes LIKE/ILIKE wildcards so user input matches literally. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c);
