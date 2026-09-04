import { db } from '../db/index.js';
import { env } from '../config/env.js';
import { buildStatsWorkbook, getSummary } from './stats.service.js';
import { sendMonthlyReportEmail } from './email.service.js';
import { monthlyReportEmail } from '../templates/monthlyReportEmail.js';

function currentYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Gửi báo cáo tổng quan (kèm Excel) vào mùng 2 hằng tháng tới NOTIFY_CC_EMAIL — tái dùng
// địa chỉ CC mặc định hiện có thay vì thêm biến môi trường mới, vì đây đúng là địa chỉ được
// yêu cầu. Cho phép "bắt kịp" trong 3 ngày đầu tháng (không chỉ đúng mùng 2) để tránh bỏ lỡ
// nếu SMTP tạm thời lỗi đúng hôm đó — vẫn chặn gửi trùng qua bảng monthly_reports.
export async function runMonthlyReportSweep() {
  const now = new Date();
  if (now.getDate() > 3) return;
  if (!env.notifyCcEmail) return;

  const yearMonth = currentYearMonth(now);
  const already = await db.get('SELECT 1 FROM monthly_reports WHERE year_month = ?', [yearMonth]);
  if (already) return;

  const summary = await getSummary();
  const workbookBuffer = await buildStatsWorkbook();
  const { subject, html } = monthlyReportEmail({ summary, yearMonth });

  const result = await sendMonthlyReportEmail({
    to: env.notifyCcEmail,
    subject,
    html,
    workbookBuffer,
    filename: `bao-cao-ho-tro-${yearMonth}.xlsx`,
  });

  if (result.sent) {
    await db.run('INSERT INTO monthly_reports (year_month) VALUES (?)', [yearMonth]);
  }
}

export function startMonthlyReportSweep() {
  const run = () => {
    runMonthlyReportSweep().catch((err) => {
      console.error('[monthly-report] Lỗi khi gửi báo cáo định kỳ:', err.message);
    });
  };
  setTimeout(run, 90 * 1000);
  setInterval(run, 6 * 60 * 60 * 1000);
}
