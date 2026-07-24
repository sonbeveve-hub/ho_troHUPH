import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { lookupStaff } from '../services/staffLookup.service.js';
import { submitRequestLimiter } from '../middleware/rateLimit.js';

export const publicRouter = Router();

publicRouter.get(
  '/departments',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare('SELECT id, name FROM departments WHERE active = 1 ORDER BY name')
      .all();
    res.json(rows);
  })
);

publicRouter.get(
  '/request-types',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare('SELECT id, name, description FROM request_types WHERE active = 1 ORDER BY name')
      .all();
    res.json(rows);
  })
);

publicRouter.get(
  '/staff/lookup',
  asyncHandler(async (req, res) => {
    const { name, department_id: departmentId } = req.query;
    const results = lookupStaff({
      name: typeof name === 'string' ? name : '',
      departmentId: departmentId ? Number(departmentId) : null,
    });
    res.json(results);
  })
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIORITIES = new Set(['gap', 'binh_thuong', 'khong_gap']);
const EMAIL_SOURCES = new Set(['auto', 'picked', 'manual']);

publicRouter.post(
  '/requests',
  submitRequestLimiter,
  asyncHandler(async (req, res) => {
    const {
      requesterName,
      departmentId,
      requestTypeId,
      priority,
      description,
      requesterEmail,
      emailSource,
      website, // honeypot — trường ẩn, con người sẽ không điền
    } = req.body || {};

    if (website) {
      // Bot điền vào honeypot: âm thầm báo thành công, không lưu gì cả
      return res.status(201).json({ ok: true });
    }

    const errors = [];
    if (!requesterName || String(requesterName).trim().length < 2) {
      errors.push('Vui lòng nhập tên đầy đủ.');
    }
    if (!departmentId || !Number.isInteger(Number(departmentId))) {
      errors.push('Vui lòng chọn khoa/phòng/đơn vị.');
    }
    if (!requestTypeId || !Number.isInteger(Number(requestTypeId))) {
      errors.push('Vui lòng chọn loại yêu cầu.');
    }
    if (!PRIORITIES.has(priority)) {
      errors.push('Vui lòng chọn mức độ ưu tiên hợp lệ.');
    }
    if (!description || String(description).trim().length < 5) {
      errors.push('Vui lòng mô tả yêu cầu chi tiết hơn.');
    }
    if (!requesterEmail || !EMAIL_RE.test(String(requesterEmail).trim())) {
      errors.push('Vui lòng nhập email hợp lệ.');
    }
    if (!EMAIL_SOURCES.has(emailSource)) {
      errors.push('Thiếu thông tin nguồn email.');
    }

    const dept = db.prepare('SELECT id FROM departments WHERE id = ? AND active = 1').get(departmentId);
    if (!dept) errors.push('Khoa/phòng/đơn vị không hợp lệ.');

    const type = db
      .prepare('SELECT id FROM request_types WHERE id = ? AND active = 1')
      .get(requestTypeId);
    if (!type) errors.push('Loại yêu cầu không hợp lệ.');

    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const insert = db.prepare(`
      INSERT INTO requests
        (request_code, requester_name, department_id, request_type_id, priority,
         description, requester_email, email_source, status, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `);

    const info = insert.run(
      'TEMP',
      String(requesterName).trim(),
      Number(departmentId),
      Number(requestTypeId),
      priority,
      String(description).trim(),
      String(requesterEmail).trim(),
      emailSource,
      req.ip || null
    );

    const requestCode = `REQ-${String(info.lastInsertRowid).padStart(6, '0')}`;
    db.prepare('UPDATE requests SET request_code = ? WHERE id = ?').run(
      requestCode,
      info.lastInsertRowid
    );
    db.prepare(
      "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'new', 'Yêu cầu được tạo')"
    ).run(info.lastInsertRowid);

    res.status(201).json({ id: info.lastInsertRowid, requestCode });
  })
);
