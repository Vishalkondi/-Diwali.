import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../env.js';
import * as schema from './schema.js';

// Serverless instances (Vercel) each hold their own pool; keep it small so a hosted database isn't flooded.
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: process.env.VERCEL ? 3 : 10 });

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
