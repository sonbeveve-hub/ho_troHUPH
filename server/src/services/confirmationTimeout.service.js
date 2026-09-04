import { env } from '../config/env.js';
import { db } from '../db/index.js';
import {
  sendConfirmReminderEmail,
  sendAutoClosedEmail,
  sendStaleInProgressEmail,
  sendCsatRequestEmail,
} from './email.service.js';
import { getSlaRule } from './sla.service.js';
import { workingDaysSince } from './workingDays.service.js';

// resolved_at/updated_at giờ là cột TIMESTAMPTZ — driver pg trả thẳng về JS Date (hoặc null),
// không còn là chuỗi text kiểu SQLite nữa nên không cần tự ghép "T"/"Z" như trước.
function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Quét các yêu cầu đang "chờ xác nhận": gửi nhắc nhở lần 1 sau reminderDays NGÀY LÀM VIỆC,
// và tự động đóng (done_auto) sau timeoutDays NGÀY LÀM VIỆC nếu người gửi vẫn không phản
// hồi — số ngày lấy theo rule SLA khớp nhất (loại yêu cầu + mức ưu tiên, xem sla.service.js),
// fallback về mặc định hệ thống nếu chưa cấu hình rule. Chạy định kỳ từ index.js — an toàn
// khi gọi lặp lại (idempotent nhờ confirm_reminder_sent_at + status).
export async function runConfirmationSweep() {
  const pending = await db.all(
    `SELECT * FROM requests WHERE status = 'resolved_pending' AND resolved_at IS NOT NULL`
  );

  for (const request of pending) {
    const resolvedAt = toDate(request.resolved_at);
    if (!resolvedAt) continue;
    const { reminder_days: reminderDays, timeout_days: timeoutDays } = await getSlaRule(
      request.request_type_id,
      request.priority
    );
    const workingDaysPassed = await workingDaysSince(resolvedAt);

    if (workingDaysPassed >= timeoutDays) {
      await db.run(
        `UPDATE requests
         SET status = 'done_auto', auto_closed_at = now(), confirmed_by = 'system',
             updated_at = now()
         WHERE id = ?`,
        [request.id]
      );
      await db.run(
        "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'done_auto', 'Tự động đóng do người gửi không phản hồi trong thời hạn quy định')",
        [request.id]
      );
      await sendAutoClosedEmail(request);
      if (request.csat_rating === null) {
        await sendCsatRequestEmail(request);
      }
      continue;
    }

    if (workingDaysPassed >= reminderDays && !request.confirm_reminder_sent_at) {
      await db.run("UPDATE requests SET confirm_reminder_sent_at = now() WHERE id = ?", [
        request.id,
      ]);
      await db.run(
        "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'resolved_pending', 'Đã gửi nhắc nhở xác nhận lần 1')",
        [request.id]
      );
      await sendConfirmReminderEmail(request);
    }
  }
}

// Quét các yêu cầu đang "Đang xử lý" nhưng không có cập nhật gì (dựa trên updated_at) quá
// inprogressStaleDays: nhắc người phụ trách (hoặc CC mặc định nếu chưa phân công) 1 lần duy
// nhất — không tự động đổi trạng thái, vì yêu cầu vẫn chưa được xử lý xong.
export async function runInProgressStaleSweep() {
  const { inprogressStaleDays } = env.confirmation;

  const stale = await db.all(
    `SELECT * FROM requests WHERE status = 'in_progress' AND inprogress_reminder_sent_at IS NULL`
  );

  for (const request of stale) {
    const updatedAt = toDate(request.updated_at);
    if (!updatedAt) continue;
    if ((await workingDaysSince(updatedAt)) < inprogressStaleDays) continue;

    await db.run("UPDATE requests SET inprogress_reminder_sent_at = now() WHERE id = ?", [
      request.id,
    ]);
    await db.run(
      "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'in_progress', 'Đã gửi nhắc nhở do yêu cầu đang xử lý quá lâu chưa cập nhật')",
      [request.id]
    );
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
