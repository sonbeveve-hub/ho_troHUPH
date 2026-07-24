import express from 'express';
import cors from 'cors';
import session from 'express-session';
import SqliteStoreFactory from 'better-sqlite3-session-store';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { db } from './db/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { publicRouter } from './routes/public.routes.js';
import { adminAuthRouter } from './routes/admin.auth.routes.js';
import { adminRequestsRouter } from './routes/admin.requests.routes.js';
import { adminCategoriesRouter } from './routes/admin.categories.routes.js';
import { adminStaffRouter } from './routes/admin.staff.routes.js';
import { adminStatsRouter } from './routes/admin.stats.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SqliteStore = SqliteStoreFactory(session);

export function createApp() {
  const app = express();

  // Cần thiết vì app luôn chạy sau một reverse proxy (Cloudflare Tunnel/cloudflared) —
  // nếu không, Express không nhận diện được request đến qua HTTPS (X-Forwarded-Proto),
  // khiến cookie session "secure" không bao giờ được set và express-rate-limit cảnh báo sai IP.
  app.set('trust proxy', 1);

  app.use(express.json());
  app.use(
    cors({
      origin: env.nodeEnv === 'development' ? 'http://localhost:5173' : true,
      credentials: true,
    })
  );

  app.use(
    session({
      store: new SqliteStore({
        client: db,
        expired: { clear: true, intervalMs: 15 * 60 * 1000 },
      }),
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: env.nodeEnv === 'production',
      },
    })
  );

  app.use('/api', publicRouter);
  app.use('/api/admin', adminAuthRouter);
  app.use('/api/admin/requests', adminRequestsRouter);
  app.use('/api/admin', adminCategoriesRouter);
  app.use('/api/admin/staff', adminStaffRouter);
  app.use('/api/admin/stats', adminStatsRouter);

  if (env.nodeEnv === 'production') {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
