import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { lookupStaff } from '../services/staffLookup.service.js';
import { submitRequestLimiter } from '../middleware/rateLimit.js';
import { saveRequestAttachments } from '../services/attachments.service.js';
import { sendSubmissionConfirmationEmail } from '../services/email.service.js';

export const publicRouter = Router();

const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TOTAL_ATTACHMENT_BYTES, files: MAX_ATTACHMENT_COUNT },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Chỉ chấp nhận file ảnh.'));
    }
    cb(null, true);
  },
});

function uploadImages(req, res, next) {
  upload.array('images', MAX_ATTACHMENT_COUNT)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Mỗi ảnh không được vượt quá 20MB.' });
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Chỉ được đính kèm tối đa ${MAX_ATTACHMENT_COUNT} ảnh.` });
    }
    return res.status(400).json({ error: err.message || 'Tải ảnh lên thất bại.' });
  });
}

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
  '/processing-times',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare('SELECT id, name FROM processing_times WHERE active = 1 ORDER BY CAST(name AS INTEGER), name')
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
const EMAIL_SOURCES = new Set(['auto', 'picked', 'manual']);

publicRouter.post(
  '/requests',
  submitRequestLimiter,
  uploadImages,
  asyncHandler(async (req, res) => {
    const {
      requesterName,
      departmentId,
      requestTypeId,
      processingTimeId,
      description,
      requesterEmail,
      emailSource,
      website, // honeypot — trường ẩn, con người sẽ không điền
    } = req.body || {};
    const files = req.files || [];

    if (website) {
      // Bot điền vào honeypot: âm thầm báo thành công, không lưu gì cả
      return res.status(201).json({ ok: true });
    }

    const totalAttachmentBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return res
        .status(400)
        .json({ error: 'Tổng dung lượng ảnh đính kèm không được vượt quá 20MB.' });
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
    if (!processingTimeId || !Number.isInteger(Number(processingTimeId))) {
      errors.push('Vui lòng chọn thời gian xử lý mong muốn.');
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

    const dept = db
      .prepare('SELECT id, name FROM departments WHERE id = ? AND active = 1')
      .get(departmentId);
    if (!dept) errors.push('Khoa/phòng/đơn vị không hợp lệ.');

    const type = db
      .prepare('SELECT id, name FROM request_types WHERE id = ? AND active = 1')
      .get(requestTypeId);
    if (!type) errors.push('Loại yêu cầu không hợp lệ.');

    const processingTime = db
      .prepare('SELECT id, name FROM processing_times WHERE id = ? AND active = 1')
      .get(processingTimeId);
    if (!processingTime) errors.push('Thời gian xử lý mong muốn không hợp lệ.');

    if (errors.length) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const insert = db.prepare(`
      INSERT INTO requests
        (request_code, requester_name, department_id, request_type_id, processing_time_id,
         description, requester_email, email_source, status, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `);

    const info = insert.run(
      'TEMP',
      String(requesterName).trim(),
      Number(departmentId),
      Number(requestTypeId),
      Number(processingTimeId),
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

    saveRequestAttachments(info.lastInsertRowid, files);

    await sendSubmissionConfirmationEmail(
      {
        id: info.lastInsertRowid,
        request_code: requestCode,
        requester_name: String(requesterName).trim(),
        requester_email: String(requesterEmail).trim(),
        description: String(description).trim(),
      },
      { departmentName: dept.name, requestTypeName: type.name, processingTimeName: processingTime.name }
    );

    res.status(201).json({ id: info.lastInsertRowid, requestCode });
  })
);
