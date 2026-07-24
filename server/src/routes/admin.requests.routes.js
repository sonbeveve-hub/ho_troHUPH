import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { sendStatusUpdateEmail, sendAssignmentEmails } from '../services/email.service.js';
import { getAttachmentFilePath, uploadsDir } from '../services/attachments.service.js';

export const adminRequestsRouter = Router();
adminRequestsRouter.use(requireAdmin);

const VALID_STATUSES = new Set(['new', 'in_progress', 'done', 'rejected']);
const PAGE_SIZE = 20;

const LIST_SELECT = `
  SELECT requests.*, departments.name AS department_name, request_types.name AS request_type_name,
         processing_times.name AS processing_time_name,
         (SELECT COUNT(*) FROM request_attachments WHERE request_attachments.request_id = requests.id) AS attachment_count
  FROM requests
  LEFT JOIN departments ON departments.id = requests.department_id
  LEFT JOIN request_types ON request_types.id = requests.request_type_id
  LEFT JOIN processing_times ON processing_times.id = requests.processing_time_id
`;

adminRequestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      status,
      department_id: departmentId,
      request_type_id: requestTypeId,
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
    if (assigneeEmail) {
      conditions.push('requests.assignee_email = ?');
      params.push(assigneeEmail);
    }
    if (q) {
      conditions.push('(requests.requester_name LIKE ? OR requests.request_code LIKE ? OR requests.requester_email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM requests ${where}`)
      .get(...params).count;

    const rows = db
      .prepare(`${LIST_SELECT} ${where} ORDER BY requests.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);

    res.json({ data: rows, page, pageSize: PAGE_SIZE, total });
  })
);

adminRequestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const request = db.prepare(`${LIST_SELECT} WHERE requests.id = ?`).get(req.params.id);

    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    const history = db
      .prepare('SELECT * FROM request_status_history WHERE request_id = ? ORDER BY changed_at ASC')
      .all(req.params.id);

    const emailLog = db
      .prepare('SELECT * FROM email_log WHERE request_id = ? ORDER BY created_at ASC')
      .all(req.params.id);

    const attachments = db
      .prepare('SELECT id, original_name, mime_type, size_bytes, created_at FROM request_attachments WHERE request_id = ? ORDER BY created_at ASC')
      .all(req.params.id);

    res.json({ ...request, history, emailLog, attachments });
  })
);

adminRequestsRouter.get(
  '/:id/attachments/:attachmentId',
  asyncHandler(async (req, res) => {
    const attachment = db
      .prepare('SELECT * FROM request_attachments WHERE id = ? AND request_id = ?')
      .get(req.params.attachmentId, req.params.id);

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

    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    db.prepare(
      "UPDATE requests SET status = ?, admin_notes = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(status, note || null, req.params.id);

    db.prepare(
      'INSERT INTO request_status_history (request_id, status, note) VALUES (?, ?, ?)'
    ).run(req.params.id, status, note || null);

    const updated = { ...request, status };
    const emailResult = await sendStatusUpdateEmail(updated, status, note);

    res.json({ ok: true, emailSent: emailResult.sent });
  })
);

adminRequestsRouter.patch(
  '/:id/details',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
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

    const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(departmentId);
    if (!dept) errors.push('Khoa/phòng/đơn vị không hợp lệ.');

    const type = db.prepare('SELECT id FROM request_types WHERE id = ?').get(requestTypeId);
    if (!type) errors.push('Loại yêu cầu không hợp lệ.');

    const processingTime = db
      .prepare('SELECT id FROM processing_times WHERE id = ?')
      .get(processingTimeId);
    if (!processingTime) errors.push('Thời gian xử lý mong muốn không hợp lệ.');

    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    db.prepare(
      `UPDATE requests
       SET requester_name = ?, department_id = ?, request_type_id = ?, processing_time_id = ?,
           requester_email = ?, description = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      String(requesterName).trim(),
      Number(departmentId),
      Number(requestTypeId),
      Number(processingTimeId),
      String(requesterEmail).trim(),
      String(description).trim(),
      req.params.id
    );

    res.json({ ok: true });
  })
);

adminRequestsRouter.patch(
  '/:id/assign',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
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

    db.prepare(
      `UPDATE requests
       SET assignee_name = ?, assignee_email = ?, assignee_phone = ?, assigned_at = datetime('now'),
           status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      trimmedName,
      String(assigneeEmail).trim(),
      assigneePhone ? String(assigneePhone).trim() : null,
      nextStatus,
      req.params.id
    );

    db.prepare(
      'INSERT INTO request_status_history (request_id, status, note) VALUES (?, ?, ?)'
    ).run(req.params.id, nextStatus, `Đã phân công cho ${trimmedName} xử lý`);

    const updated = db.prepare(`${LIST_SELECT} WHERE requests.id = ?`).get(req.params.id);
    const emailResult = await sendAssignmentEmails(updated);

    res.json({ ok: true, ...emailResult });
  })
);

adminRequestsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT id FROM requests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy yêu cầu.' });

    db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);

    const dir = path.join(uploadsDir, req.params.id);
    fs.rm(dir, { recursive: true, force: true }, () => {});

    res.json({ ok: true });
  })
);
