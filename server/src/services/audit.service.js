import { db } from '../db/index.js';

function toText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Ghi 1 dòng audit log. actorId có thể null (thao tác không gắn với 1 tài khoản cụ thể,
// hiếm khi xảy ra vì mọi route mutating đều đứng sau requireAdmin). db.prepare() gọi mới mỗi
// lần (không cache ở module scope) vì bảng audit_logs chỉ tồn tại SAU khi migrate() chạy —
// import ESM được hoist trước migrate() nên prepare() ở top-level sẽ lỗi "no such table".
export function logAudit({ actorId = null, requestId = null, action, fieldName = null, oldValue = null, newValue = null }) {
  db.prepare(
    `INSERT INTO audit_logs (request_id, actor_id, action, field_name, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(requestId, actorId, action, fieldName, toText(oldValue), toText(newValue));
}

// So sánh các field chỉ định giữa oldRow/newRow, tự ghi 1 dòng audit cho MỖI field thay đổi
// (field-level, không gộp nhiều trường vào 1 dòng) — dùng cho các route "sửa nhiều trường
// cùng lúc" như /:id/details, /:id/assign.
export function diffAndLog({ actorId, requestId = null, action, oldRow, newRow, fields }) {
  for (const field of fields) {
    const oldVal = oldRow ? oldRow[field] : undefined;
    const newVal = newRow ? newRow[field] : undefined;
    if (oldVal === newVal) continue;
    logAudit({ actorId, requestId, action, fieldName: field, oldValue: oldVal, newValue: newVal });
  }
}
