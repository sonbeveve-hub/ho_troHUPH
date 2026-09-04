import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  sendStatusUpdateEmail,
  sendAssignmentEmails,
  sendResolvedPendingEmail,
  sendCsatRequestEmail,
} from '../services/email.service.js';
import { getAttachmentFilePath, uploadsDir } from '../services/attachments.service.js';
import { logAudit, diffAndLog } from '../services/audit.service.js';
import { getSlaRule } from '../services/sla.service.js';
import { workingDaysSince } from '../services/workingDays.service.js';

const PRIORITY_VALUES = new Set(['P1', 'P2', 'P3', 'P4']);

export const adminRequestsRouter = Router();
adminRequestsRouter.use(requireAdmin);

const VALID_STATUSES = new Set([
  'new',
  'in_progress',
  'resolved_pending',
  'reopened',
  'done',
  'done_auto',
  'rejected',
]);
const PAGE_SIZE = 20;

const LIST_SELECT = `
  SELECT requests.*, departments.name AS department_name, request_types.name AS request_type_name,
         processing_times.name AS processing_time_name,
         dup.request_code AS duplicate_of_code, dup.id AS duplicate_of_id,
         (SELECT COUNT(*) FROM request_attachments WHERE request_attachments.request_id = requests.id) AS attachment_count
  FROM requests
  LEFT JOIN departments ON departments.id = requests.department_id
  LEFT JOIN request_types ON request_types.id = requests.request_type_id
  LEFT JOIN processing_times ON processing_times.id = requests.processing_time_id
  LEFT JOIN requests dup ON dup.id = requests.possible_duplicate_of_id
`;

adminRequestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      status,
      department_id: departmentId,
      request_type_id: requestTypeId,
      priority,
      assignee_email: assigneeEmail,
      q,
    } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('requests.status = ?');
      params.push(status);
    }
    if (departmentId) {
      conditions.push('requests.department_id = ?');
      params.push(departmentId);
    }
    if (requestTypeId) {
      conditions.push('requests.request_type_id = ?');
      params.push(requestTypeId);
    }
    if (priority && PRIORITY_VALUES.has(priority)) {
      conditions.push('requests.priority = ?');
      params.push(priority);
    }
    if (assigneeEmail) {
      conditions.push('requests.assignee_email = ?');
      params.push(assigneeEmail);
    }
    if (q) {
      conditions.push('(requests.requester_name ILIKE ? OR requests.request_code ILIKE ? OR requests.requester_email ILIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (await db.get(`SELECT COUNT(*) AS count FROM requests ${where}`, params)).count;

    // Sắp theo mức độ ưu tiên trước (P1 < P4 theo thứ tự chữ, đúng thứ tự ưu tiên mong
    // muốn); trong cùng mức độ thì mới nhất lên trước.
    const rows = await db.all(
      `${LIST_SELECT} ${where}
       ORDER BY requests.priority ASC, requests.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    );

    res.json({ data: rows, page, pageSize: PAGE_SIZE, total });
  })
);

// Số lượng theo trạng thái — dùng cho bộ đếm trên các tab (Mới tiếp nhận/Đang xử lý/Chờ xác
// nhận). Áp cùng bộ lọc với danh sách (trừ status/page) để số đếm khớp với những gì đang lọc.
// Đăng ký TRƯỚC "/:id" để không bị nuốt nhầm thành id (Express khớp theo thứ tự đăng ký).
adminRequestsRouter.get(
  '/counts',
  asyncHandler(async (req, res) => {
    const {
      department_id: departmentId,
      request_type_id: requestTypeId,
      priority,
      assignee_email: assigneeEmail,
      q,
    } = req.query;

    const conditions = [];
    const params = [];
    if (departmentId) {
      conditions.push('department_id = ?');
      params.push(departmentId);
    }
    if (requestTypeId) {
      conditions.push('request_type_id = ?');
      params.push(requestTypeId);
    }
    if (priority && PRIORITY_VALUES.has(priority)) {
      conditions.push('priority = ?');
      params.push(priority);
    }
    if (assigneeEmail) {
      conditions.push('assignee_email = ?');
      params.push(assigneeEmail);
    }
    if (q) {
      conditions.push('(requester_name ILIKE ? OR request_code ILIKE ? OR requester_email ILIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db.all(
      `SELECT status, COUNT(*) AS count FROM requests ${where} GROUP BY status`,
      params
    );

    const counts = {};
    rows.forEach((r) => {
      counts[r.status] = r.count;
    });
    res.json(counts);
  })
);

adminRequestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const request = await db.get(`${LIST_SELECT} WHERE requests.id = ?`, [req.params.id]);

    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    const history = await db.all(
      'SELECT * FROM request_status_history WHERE request_id = ? ORDER BY changed_at ASC',
      [req.params.id]
    );

    const emailLog = await db.all(
      'SELECT * FROM email_log WHERE request_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    const attachments = await db.all(
      'SELECT id, original_name, mime_type, size_bytes, created_at FROM request_attachments WHERE request_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    const auditLog = await db.all(
      `SELECT audit_logs.*, admin_users.full_name AS actor_name, admin_users.username AS actor_username
       FROM audit_logs
       LEFT JOIN admin_users ON admin_users.id = audit_logs.actor_id
       WHERE audit_logs.request_id = ?
       ORDER BY audit_logs.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...request, history, emailLog, attachments, auditLog });
  })
);

adminRequestsRouter.get(
  '/:id/attachments/:attachmentId',
  asyncHandler(async (req, res) => {
    const attachment = await db.get(
      'SELECT * FROM request_attachments WHERE id = ? AND request_id = ?',
      [req.params.attachmentId, req.params.id]
    );

    if (!attachment) return res.status(404).json({ error: 'Không tìm thấy tệp đính kèm.' });

    const filePath = getAttachmentFilePath(req.params.id, attachment.stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Tệp không còn tồn tại trên máy chủ.' });
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  })
);

adminRequestsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status, note } = req.body || {};
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    }
    if (status === 'resolved_pending' && (!note || !String(note).trim())) {
      return res.status(400).json({
        error: 'Vui lòng mô tả giải pháp/nguyên nhân khi đánh dấu đã xử lý.',
      });
    }

    const request = await db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    if (status === 'resolved_pending') {
      await db.run(
        `UPDATE requests
         SET status = ?, admin_notes = ?, resolved_at = now(),
             confirm_reminder_sent_at = NULL, updated_at = now()
         WHERE id = ?`,
        [status, note || null, req.params.id]
      );
    } else if (status === 'in_progress') {
      await db.run(
        `UPDATE requests
         SET status = ?, admin_notes = ?, inprogress_reminder_sent_at = NULL, updated_at = now()
         WHERE id = ?`,
        [status, note || null, req.params.id]
      );
    } else {
      await db.run(
        "UPDATE requests SET status = ?, admin_notes = ?, updated_at = now() WHERE id = ?",
        [status, note || null, req.params.id]
      );
    }

    await db.run(
      'INSERT INTO request_status_history (request_id, status, note) VALUES (?, ?, ?)',
      [req.params.id, status, note || null]
    );

    await diffAndLog({
      actorId: req.session.adminId,
      requestId: Number(req.params.id),
      action: 'status_change',
      oldRow: request,
      newRow: { status, admin_notes: note || null },
      fields: ['status', 'admin_notes'],
    });

    const updated = { ...request, status };
    // Chỉ gửi email khi trạng thái THỰC SỰ thay đổi — tránh gửi trùng email khi admin bấm
    // "Lưu & gửi email" với trạng thái không đổi (ví dụ: vừa phân công xong — đã tự chuyển
    // "Đang xử lý" và gửi email riêng — rồi lại bấm lưu form trạng thái cũng đang là "Đang xử
    // lý"). Ghi chú/audit vẫn được lưu bình thường, chỉ bỏ qua bước gửi email.
    const emailResult =
      status === request.status
        ? { sent: false, reason: 'unchanged' }
        : status === 'resolved_pending'
          ? await sendResolvedPendingEmail(updated, note)
          : await sendStatusUpdateEmail(updated, status, note);

    res.json({ ok: true, emailSent: emailResult.sent, emailReason: emailResult.reason });
  })
);

// Xác nhận thay người gửi (khi họ vắng mặt/không phản hồi được) — chỉ admin đã đăng nhập
// mới gọi được endpoint này. Chỉ áp dụng khi yêu cầu đang chờ xác nhận VÀ đã qua thời hạn
// nhắc nhở tính theo NGÀY LÀM VIỆC của rule SLA khớp nhất (loại yêu cầu + mức ưu tiên, xem
// sla.service.js) — cùng cách tính với runConfirmationSweep(), để nhất quán với ngưỡng nhắc
// nhở/tự đóng tự động — và bắt buộc admin ghi rõ lý do.
adminRequestsRouter.patch(
  '/:id/confirm-on-behalf',
  asyncHandler(async (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 3) {
      return res.status(400).json({ error: 'Vui lòng ghi rõ lý do xác nhận thay.' });
    }

    const request = await db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });
    if (request.status !== 'resolved_pending') {
      return res.status(400).json({ error: 'Yêu cầu này không ở trạng thái chờ xác nhận.' });
    }
    if (!request.resolved_at) {
      return res.status(400).json({ error: 'Yêu cầu chưa có mốc thời gian xử lý hợp lệ.' });
    }
    // resolved_at giờ là cột TIMESTAMPTZ — driver pg trả thẳng về JS Date, không còn là chuỗi
    // text kiểu SQLite nữa nên không cần tự ghép "T"/"Z" như trước.
    const resolvedAt = request.resolved_at;
    const { reminder_days: reminderDays } = await getSlaRule(request.request_type_id, request.priority);
    if ((await workingDaysSince(resolvedAt)) < reminderDays) {
      return res.status(400).json({
        error: `Chỉ có thể xác nhận thay sau ${reminderDays} ngày làm việc kể từ khi đánh dấu đã xử lý, để người gửi có cơ hội tự phản hồi trước.`,
      });
    }

    const adminUsername = req.session.adminUsername;
    const note = `Xác nhận thay bởi quản trị viên (${adminUsername}) — lý do: ${reason}`;

    await db.run(
      `UPDATE requests
       SET status = 'done', requester_confirmed_at = now(), confirmed_by = 'delegate',
           updated_at = now()
       WHERE id = ?`,
      [req.params.id]
    );

    await db.run(
      "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'done', ?)",
      [req.params.id, note]
    );

    await logAudit({
      actorId: req.session.adminId,
      requestId: Number(req.params.id),
      action: 'confirm_on_behalf',
      fieldName: 'status',
      oldValue: request.status,
      newValue: 'done',
    });

    // Xác nhận thay không có cơ hội để người gửi tự chọn sao — mời đánh giá riêng qua email.
    await sendCsatRequestEmail(request);

    res.json({ ok: true });
  })
);

adminRequestsRouter.patch(
  '/:id/details',
  asyncHandler(async (req, res) => {
    const existing = await db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    const { requesterName, departmentId, requestTypeId, processingTimeId, requesterEmail, description } =
      req.body || {};

    const errors = [];
    if (!requesterName || String(requesterName).trim().length < 2) {
      errors.push('Vui lòng nhập tên đầy đủ.');
    }
    if (!description || String(description).trim().length < 5) {
      errors.push('Vui lòng mô tả yêu cầu chi tiết hơn.');
    }
    if (!requesterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(requesterEmail).trim())) {
      errors.push('Vui lòng nhập email hợp lệ.');
    }

    const dept = await db.get('SELECT id FROM departments WHERE id = ?', [departmentId]);
    if (!dept) errors.push('Khoa/phòng/đơn vị không hợp lệ.');

    const type = await db.get('SELECT id FROM request_types WHERE id = ?', [requestTypeId]);
    if (!type) errors.push('Loại yêu cầu không hợp lệ.');

    const processingTime = await db.get('SELECT id FROM processing_times WHERE id = ?', [
      processingTimeId,
    ]);
    if (!processingTime) errors.push('Thời gian xử lý mong muốn không hợp lệ.');

    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const next = {
      requester_name: String(requesterName).trim(),
      department_id: Number(departmentId),
      request_type_id: Number(requestTypeId),
      processing_time_id: Number(processingTimeId),
      requester_email: String(requesterEmail).trim(),
      description: String(description).trim(),
    };

    await db.run(
      `UPDATE requests
       SET requester_name = ?, department_id = ?, request_type_id = ?, processing_time_id = ?,
           requester_email = ?, description = ?, updated_at = now()
       WHERE id = ?`,
      [
        next.requester_name,
        next.department_id,
        next.request_type_id,
        next.processing_time_id,
        next.requester_email,
        next.description,
        req.params.id,
      ]
    );

    await diffAndLog({
      actorId: req.session.adminId,
      requestId: Number(req.params.id),
      action: 'edit_info',
      oldRow: existing,
      newRow: next,
      fields: ['requester_name', 'department_id', 'request_type_id', 'processing_time_id', 'requester_email', 'description'],
    });

    res.json({ ok: true });
  })
);

// Đặt/đổi mức độ ưu tiên (dùng khi triage, ghi đè giá trị tự động gán theo loại yêu cầu).
adminRequestsRouter.patch(
  '/:id/priority',
  asyncHandler(async (req, res) => {
    const existing = await db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    const { priority } = req.body || {};
    if (!PRIORITY_VALUES.has(priority)) {
      return res.status(400).json({ error: 'Mức độ ưu tiên không hợp lệ.' });
    }

    await db.run('UPDATE requests SET priority = ?, updated_at = now() WHERE id = ?', [
      priority,
      req.params.id,
    ]);

    await logAudit({
      actorId: req.session.adminId,
      requestId: Number(req.params.id),
      action: 'priority_change',
      fieldName: 'priority',
      oldValue: existing.priority,
      newValue: priority,
    });

    res.json({ ok: true });
  })
);

adminRequestsRouter.patch(
  '/:id/assign',
  asyncHandler(async (req, res) => {
    const existing = await db.get('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    const { assigneeName, assigneeEmail, assigneePhone } = req.body || {};

    const errors = [];
    if (!assigneeName || String(assigneeName).trim().length < 2) {
      errors.push('Vui lòng nhập tên người xử lý.');
    }
    if (!assigneeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(assigneeEmail).trim())) {
      errors.push('Vui lòng nhập email người xử lý hợp lệ.');
    }
    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const nextStatus = existing.status === 'new' ? 'in_progress' : existing.status;
    const trimmedName = String(assigneeName).trim();
    const next = {
      assignee_name: trimmedName,
      assignee_email: String(assigneeEmail).trim(),
      assignee_phone: assigneePhone ? String(assigneePhone).trim() : null,
    };

    await db.run(
      `UPDATE requests
       SET assignee_name = ?, assignee_email = ?, assignee_phone = ?, assigned_at = now(),
           status = ?, inprogress_reminder_sent_at = NULL, updated_at = now()
       WHERE id = ?`,
      [next.assignee_name, next.assignee_email, next.assignee_phone, nextStatus, req.params.id]
    );

    await db.run(
      'INSERT INTO request_status_history (request_id, status, note) VALUES (?, ?, ?)',
      [req.params.id, nextStatus, `Đã phân công cho ${trimmedName} xử lý`]
    );

    await diffAndLog({
      actorId: req.session.adminId,
      requestId: Number(req.params.id),
      action: 'assign',
      oldRow: existing,
      newRow: next,
      fields: ['assignee_name', 'assignee_email', 'assignee_phone'],
    });

    const updated = await db.get(`${LIST_SELECT} WHERE requests.id = ?`, [req.params.id]);
    const emailResult = await sendAssignmentEmails(updated);

    res.json({ ok: true, ...emailResult });
  })
);

adminRequestsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await db.get(
      'SELECT id, request_code, requester_name FROM requests WHERE id = ?',
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    // Ghi audit TRƯỚC khi xoá — audit_logs.request_id có ON DELETE SET NULL nên dòng này vẫn
    // còn lại sau khi requests bị xoá (chỉ mất liên kết request_id), giữ lại bằng chứng đã xoá.
    await logAudit({
      actorId: req.session.adminId,
      requestId: Number(req.params.id),
      action: 'delete',
      oldValue: `${existing.request_code} — ${existing.requester_name}`,
    });

    await db.run('DELETE FROM requests WHERE id = ?', [req.params.id]);

    const dir = path.join(uploadsDir, req.params.id);
    fs.rm(dir, { recursive: true, force: true }, () => {});

    res.json({ ok: true });
  })
);
