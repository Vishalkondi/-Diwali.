import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';

/** An error with an HTTP status that the central handler turns into `{ error, details? }`. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Not found') => new HttpError(404, what);

/** Parse with Zod; a failure becomes a 400 with per-field messages in `details`. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export function validationError(err: z.ZodError) {
  const details: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    details[key] ??= issue.message;
  }
  return new HttpError(400, 'Please check the highlighted fields.', details);
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => uuidRe.test(v);

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound('No such endpoint'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof HttpError) {
    res.status(err.status).json(err.details === undefined ? { error: err.message } : { error: err.message, details: err.details });
    return;
  }
  if (err instanceof z.ZodError) {
    const e = validationError(err);
    res.status(400).json({ error: e.message, details: e.details });
    return;
  }
  // body-parser errors carry a status and a type
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    const message = err.type === 'entity.too.large' ? 'That request is too large.' : 'Malformed request body.';
    res.status(err.status).json({ error: message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
};
