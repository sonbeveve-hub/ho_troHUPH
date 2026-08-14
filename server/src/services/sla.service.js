import { env } from '../config/env.js';
import { db } from '../db/index.js';

// Tra cứu rule SLA theo đúng thứ tự ưu tiên trong đặc tả: (1) khớp cả loại yêu cầu + mức ưu
// tiên cụ thể, (2) khớp loại yêu cầu (priority NULL = áp dụng mọi mức), (3) fallback về hằng
// số toàn cục hiện có trong .env nếu chưa cấu hình rule nào.
export function getSlaRule(requestTypeId, priority) {
  const specific = db
    .prepare('SELECT reminder_days, timeout_days FROM sla_rules WHERE request_type_id = ? AND priority = ?')
    .get(requestTypeId, priority);
  if (specific) return specific;

  const byType = db
    .prepare('SELECT reminder_days, timeout_days FROM sla_rules WHERE request_type_id = ? AND priority IS NULL')
    .get(requestTypeId);
  if (byType) return byType;

  return {
    reminder_days: env.confirmation.reminderDays,
    timeout_days: env.confirmation.timeoutDays,
  };
}
