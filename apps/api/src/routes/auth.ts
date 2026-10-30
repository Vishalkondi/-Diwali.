import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { isTest } from '../env.js';
import { cookieOptions, optionalAuth, SESSION_COOKIE, sessionCookie } from '../lib/auth.js';
import { HttpError, parse } from '../lib/http.js';
import { isUniqueViolation } from '../lib/slug.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.'));

const registerBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60, 'Name must be 60 characters or fewer.'),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters.').max(200, 'That password is too long.'),
});

const loginBody = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(200),
});

type PublicUser = { id: string; name: string; email: string; createdAt: Date };
const publicUser = (u: PublicUser) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });
const publicCols = { id: users.id, name: users.name, email: users.email, createdAt: users.createdAt };

authRouter.post('/register', authLimiter, async (req, res) => {
  const body = parse(registerBody, req.body);
  const passwordHash = await bcrypt.hash(body.password, 10);
  try {
    const [user] = await db
      .insert(users)
      .values({ name: body.name, email: body.email, passwordHash })
      .returning(publicCols);
    res.cookie(...sessionCookie(user!.id));
    res.status(201).json({ user: publicUser(user!) });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'An account with this email already exists.', { email: 'This email is already registered. Try signing in.' });
    }
    throw err;
  }
});

// Compared against when the email is unknown, so timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

authRouter.post('/login', authLimiter, async (req, res) => {
  const body = parse(loginBody, req.body);
  const [user] = await db.select().from(users).where(eq(sql`lower(${users.email})`, body.email));
  const ok = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'That email and password don’t match.');
  res.cookie(...sessionCookie(user.id));
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.json({ ok: true });
});

authRouter.get('/me', optionalAuth, async (req, res) => {
  if (!req.userId) return void res.json({ user: null });
  const [user] = await db.select(publicCols).from(users).where(eq(users.id, req.userId));
  res.json({ user: user ? publicUser(user) : null });
});
