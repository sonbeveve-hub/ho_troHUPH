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
import { adminAssigneesRouter } from './routes/admin.assignees.routes.js';
import { adminStatsRouter } from './routes/admin.stats.routes.js';
import { adminFaqRouter } from './routes/admin.faq.routes.js';
import { adminUsersRouter } from './routes/admin.users.routes.js';
import { adminSlaRouter } from './routes/admin.sla.routes.js';
import { adminHolidaysRouter } from './routes/admin.holidays.routes.js';
import { adminFaqCandidatesRouter } from './routes/admin.faqCandidates.routes.js';

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

  // adminCategoriesRouter được mount ở prefix /api/admin trần (không có path con riêng) vì
  // các route của nó (/departments, /request-types, /processing-times) không dùng chung 1
  // tiền tố cố định. Express khớp middleware theo THỨ TỰ ĐĂNG KÝ chứ không theo độ cụ thể của
  // path, nên nếu router này đăng ký TRƯỚC router khác cũng nằm dưới /api/admin/*, middleware
  // .use(requireFullAdmin) bên trong nó sẽ chặn nhầm cả những request vốn không khớp route nào
  // của nó (ví dụ suýt chặn nhầm /api/admin/stats/* trước khi tới đúng adminStatsRouter — lỗi
  // thật đã gặp khi thêm role 'handler'). Luôn đăng ký router này SAU CÙNG trong nhóm /api/admin
  // để nó chỉ còn "vét" đúng phần không router cụ thể nào khác nhận.
  app.use('/api', publicRouter);
  app.use('/api/admin', adminAuthRouter);
  app.use('/api/admin/requests', adminRequestsRouter);
  app.use('/api/admin/staff', adminStaffRouter);
  app.use('/api/admin/assignees', adminAssigneesRouter);
  app.use('/api/admin/stats', adminStatsRouter);
  app.use('/api/admin/faq', adminFaqRouter);
  app.use('/api/admin/users', adminUsersRouter);
  app.use('/api/admin/sla-rules', adminSlaRouter);
  app.use('/api/admin/holidays', adminHolidaysRouter);
  app.use('/api/admin/faq-candidates', adminFaqCandidatesRouter);
  app.use('/api/admin', adminCategoriesRouter);

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
