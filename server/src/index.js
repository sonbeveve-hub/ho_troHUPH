import { env } from './config/env.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { closePool } from './db/index.js';
import { createApp } from './app.js';
import { startConfirmationSweep } from './services/confirmationTimeout.service.js';
import { startFaqCandidateSweep } from './services/faqCandidate.service.js';
import { startMonthlyReportSweep } from './services/monthlyReport.service.js';

// migrate()/seed() giờ bất đồng bộ (Postgres) — phải đợi xong mới tạo app/lắng nghe cổng, không
// thì request đầu tiên có thể chạy trước khi bảng đã được tạo.
async function main() {
  await migrate();
  await seed();

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`Server đang chạy tại http://localhost:${env.port} (${env.nodeEnv})`);
  });

  startConfirmationSweep();
  startFaqCandidateSweep();
  startMonthlyReportSweep();

  // Đóng pool Postgres sạch sẽ khi tiến trình dừng (Ctrl+C lúc dev, "docker stop"/SIGTERM khi
  // chạy container) — tránh kết nối bị cắt đột ngột.
  const shutdown = () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Lỗi khởi động server:', err);
  process.exit(1);
});
