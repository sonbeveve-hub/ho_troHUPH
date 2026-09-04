import { env } from '../config/env.js';
import { db } from '../db/index.js';

// Tra cứu rule SLA theo đúng thứ tự ưu tiên trong đặc tả: (1) khớp cả loại yêu cầu + mức ưu
// tiên cụ thể, (2) khớp loại yêu cầu (priority NULL = áp dụng mọi mức), (3) fallback về hằng
// số toàn cục hiện có trong .env nếu chưa cấu hình rule nào.
export async function getSlaRule(requestTypeId, priority) {
  const specific = await db.get(
    'SELECT reminder_days, timeout_days FROM sla_rules WHERE request_type_id = ? AND priority = ?',
    [requestTypeId, priority]
  );
  if (specific) return specific;

  const byType = await db.get(
    'SELECT reminder_days, timeout_days FROM sla_rules WHERE request_type_id = ? AND priority IS NULL',
    [requestTypeId]
  );
  if (byType) return byType;

  return {
    reminder_days: env.confirmation.reminderDays,
    timeout_days: env.confirmation.timeoutDays,
  };
}
