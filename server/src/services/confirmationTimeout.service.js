import { env } from '../config/env.js';
import { db } from '../db/index.js';
import {
  sendConfirmReminderEmail,
  sendAutoClosedEmail,
  sendStaleInProgressEmail,
} from './email.service.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Quét các yêu cầu đang "chờ xác nhận": gửi nhắc nhở lần 1 sau reminderDays, và tự động
// đóng (done_auto) sau timeoutDays nếu người gửi vẫn không phản hồi. Chạy định kỳ từ
// index.js — an toàn khi gọi lặp lại (idempotent nhờ confirm_reminder_sent_at + status).
export async function runConfirmationSweep() {
  const { reminderDays, timeoutDays } = env.confirmation;
  const now = Date.now();

  const pending = db
    .prepare(
      `SELECT * FROM requests WHERE status = 'resolved_pending' AND resolved_at IS NOT NULL`
    )
    .all();

  for (const request of pending) {
    const resolvedAtMs = new Date(`${request.resolved_at.replace(' ', 'T')}Z`).getTime();
    if (Number.isNaN(resolvedAtMs)) continue;
    const daysSinceResolved = (now - resolvedAtMs) / MS_PER_DAY;

    if (daysSinceResolved >= timeoutDays) {
      db.prepare(
        `UPDATE requests
         SET status = 'done_auto', auto_closed_at = datetime('now'), confirmed_by = 'system',
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(request.id);
      db.prepare(
        "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'done_auto', 'Tự động đóng do người gửi không phản hồi trong thời hạn quy định')"
      ).run(request.id);
      await sendAutoClosedEmail(request);
      continue;
    }

    if (daysSinceResolved >= reminderDays && !request.confirm_reminder_sent_at) {
      db.prepare(
        "UPDATE requests SET confirm_reminder_sent_at = datetime('now') WHERE id = ?"
      ).run(request.id);
      db.prepare(
        "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'resolved_pending', 'Đã gửi nhắc nhở xác nhận lần 1')"
      ).run(request.id);
      await sendConfirmReminderEmail(request);
    }
  }
}

// Quét các yêu cầu đang "Đang xử lý" nhưng không có cập nhật gì (dựa trên updated_at) quá
// inprogressStaleDays: nhắc người phụ trách (hoặc CC mặc định nếu chưa phân công) 1 lần duy
// nhất — không tự động đổi trạng thái, vì yêu cầu vẫn chưa được xử lý xong.
export async function runInProgressStaleSweep() {
  const { inprogressStaleDays } = env.confirmation;
  const now = Date.now();

  const stale = db
    .prepare(
      `SELECT * FROM requests WHERE status = 'in_progress' AND inprogress_reminder_sent_at IS NULL`
    )
    .all();

  for (const request of stale) {
    const updatedAtMs = new Date(`${request.updated_at.replace(' ', 'T')}Z`).getTime();
    if (Number.isNaN(updatedAtMs)) continue;
    const daysSinceUpdate = (now - updatedAtMs) / MS_PER_DAY;
    if (daysSinceUpdate < inprogressStaleDays) continue;

    db.prepare(
      "UPDATE requests SET inprogress_reminder_sent_at = datetime('now') WHERE id = ?"
    ).run(request.id);
    db.prepare(
      "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'in_progress', 'Đã gửi nhắc nhở do yêu cầu đang xử lý quá lâu chưa cập nhật')"
    ).run(request.id);
    await sendStaleInProgressEmail(request, inprogressStaleDays);
  }
}

export function startConfirmationSweep() {
  const intervalMs = env.confirmation.sweepIntervalMinutes * 60 * 1000;
  const run = () => {
    runConfirmationSweep().catch((err) => {
      console.error('[confirmation-sweep] Lỗi khi quét yêu cầu chờ xác nhận:', err.message);
    });
    runInProgressStaleSweep().catch((err) => {
      console.error('[confirmation-sweep] Lỗi khi quét yêu cầu đang xử lý quá lâu:', err.message);
    });
  };
  // Chạy 1 lần ngay sau khi server sẵn sàng (trễ 60s để không cạnh tranh tài nguyên với
  // lúc khởi động), sau đó lặp lại theo chu kỳ cấu hình.
  setTimeout(run, 60 * 1000);
  setInterval(run, intervalMs);
}
