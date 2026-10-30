import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { sql } from 'drizzle-orm';
import { db } from './db/client.js';
import { env, isProd } from './env.js';
import { errorHandler, notFoundHandler } from './lib/http.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { communityRouter } from './routes/community.js';
import { ordersRouter } from './routes/orders.js';
import { rewardsRouter } from './routes/rewards.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (isProd) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(cookieParser());
  // Rangoli strokes are bigger than everything else; give that one route more room.
  app.use('/api/rangolis', express.json({ limit: '300kb' }));
  app.use(express.json({ limit: '50kb' }));

  const api = express.Router();
  api.get('/health', async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json({ ok: true, service: 'diya-dash-api', time: new Date().toISOString() });
  });
  api.use('/auth', authRouter);
  api.use(catalogRouter);
  api.use('/orders', ordersRouter);
  api.use(rewardsRouter);
  api.use(communityRouter);
  api.use(notFoundHandler);
  app.use('/api', api);

  // Production: serve the built SPA with a history fallback.
  const webDist = resolve(import.meta.dirname, '../../web/dist');
  if (isProd && existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) return next();
      res.sendFile(resolve(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
