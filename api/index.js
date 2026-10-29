// Điểm vào serverless trên Vercel — thay cho server/src/index.js (app.listen + setInterval) khi
// chạy trên PC. Mọi request /api/* được vercel.json rewrite về function này; các job nền chạy
// qua Vercel Cron gọi /api/cron/daily (xem server/src/routes/cron.routes.js).
import './_tz.js';
import { migrate } from '../server/src/db/migrate.js';
import { seed } from '../server/src/db/seed.js';
import { createApp } from '../server/src/app.js';

const app = createApp();

// migrate()/seed() chạy 1 lần mỗi lần function khởi động lạnh (cold start), không chạy lại cho
// các request sau trên cùng instance. Lỗi thì xoá promise để request kế tiếp thử lại.
let ready;
function ensureReady() {
  ready ??= (async () => {
    await migrate();
    await seed();
  })().catch((err) => {
    ready = undefined;
    throw err;
  });
  return ready;
}

export default async function handler(req, res) {
  try {
    await ensureReady();
  } catch (err) {
    console.error('Lỗi khởi tạo database:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Máy chủ đang gặp sự cố kết nối cơ sở dữ liệu.' }));
    return;
  }
  return app(req, res);
}
