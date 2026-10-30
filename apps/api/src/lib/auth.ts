import type { CookieOptions, Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../env.js';
import { HttpError } from './http.js';

export const SESSION_COOKIE = 'dd_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
};

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

export function sessionCookie(userId: string): [string, string, CookieOptions] {
  return [SESSION_COOKIE, signSession(userId), { ...cookieOptions, maxAge: MAX_AGE_MS }];
}

function readUserId(req: Request): string | null {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || !token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string | null;
    }
  }
}

/** Attaches `req.userId` (or null) without rejecting. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  req.userId = readUserId(req);
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  req.userId = readUserId(req);
  if (!req.userId) return next(new HttpError(401, 'Please sign in to continue.'));
  next();
};

export function userIdOf(req: Request): string {
  if (!req.userId) throw new HttpError(401, 'Please sign in to continue.');
  return req.userId;
}
