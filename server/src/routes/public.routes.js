import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { lookupStaff } from '../services/staffLookup.service.js';
import { submitRequestLimiter, trackRequestLimiter, aiLimiter, aiChatLimiter } from '../middleware/rateLimit.js';
import { saveRequestAttachments } from '../services/attachments.service.js';
import { sendSubmissionConfirmationEmail, sendReopenedNotificationEmail } from '../services/email.service.js';
import { getInitialSuggestion, getAlternativeSuggestion, getChatReply } from '../services/ai.service.js';
import { isGeminiConfigured } from '../config/env.js';

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
      .prepare('SELECT id, name FROM departments WHERE active = 1 ORDER BY sort_order, id')
      .all();
    res.json(rows);
  })
);

publicRouter.get(
  '/request-types',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare('SELECT id, name, description FROM request_types WHERE active = 1 ORDER BY sort_order, id')
      .all();
    res.json(rows);
  })
);

publicRouter.get(
  '/processing-times',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare('SELECT id, name FROM processing_times WHERE active = 1 ORDER BY sort_order, id')
      .all();
    res.json(rows);
  })
);

publicRouter.get(
  '/staff/lookup',
  asyncHandler(async (req, res) => {
    const { name } = req.query;
    const results = lookupStaff({ name: typeof name === 'string' ? name : '' });
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

const TRACK_SELECT_BASE = `
  SELECT requests.id, requests.request_code, requests.requester_name, requests.description,
         requests.status, requests.assignee_name, requests.requester_confirmed_at,
         requests.admin_notes, requests.csat_rating, requests.reject_count,
         requests.created_at, requests.updated_at,
         departments.name AS department_name, request_types.name AS request_type_name,
         processing_times.name AS processing_time_name
  FROM requests
  LEFT JOIN departments ON departments.id = requests.department_id
  LEFT JOIN request_types ON request_types.id = requests.request_type_id
  LEFT JOIN processing_times ON processing_times.id = requests.processing_time_id
`;

function getRequestHistory(requestId) {
  return db
    .prepare('SELECT status, note, changed_at FROM request_status_history WHERE request_id = ? ORDER BY changed_at ASC')
    .all(requestId);
}

publicRouter.get(
  '/track/search',
  trackRequestLimiter,
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) return res.json([]);

    const like = `%${q}%`;
    const rows = db
      .prepare(
        `${TRACK_SELECT_BASE}
         WHERE requests.request_code LIKE ?
            OR requests.requester_name LIKE ?
            OR requests.requester_email LIKE ?
            OR departments.name LIKE ?
         ORDER BY requests.created_at DESC
         LIMIT 20`
      )
      .all(like, like, like, like);

    res.json(rows.map((r) => ({ ...r, history: getRequestHistory(r.id) })));
  })
);

publicRouter.get(
  '/track/:code',
  trackRequestLimiter,
  asyncHandler(async (req, res) => {
    const request = db
      .prepare(`${TRACK_SELECT_BASE} WHERE requests.request_code = ?`)
      .get(req.params.code.trim().toUpperCase());
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã này.' });

    res.json({ ...request, history: getRequestHistory(request.id) });
  })
);

publicRouter.post(
  '/track/:code/confirm',
  trackRequestLimiter,
  asyncHandler(async (req, res) => {
    const request = db
      .prepare('SELECT id, status, requester_confirmed_at FROM requests WHERE request_code = ?')
      .get(req.params.code.trim().toUpperCase());
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã này.' });

    if (request.status !== 'resolved_pending') {
      return res.status(400).json({ error: 'Yêu cầu này chưa ở trạng thái chờ xác nhận.' });
    }

    const rating = Number(req.body?.rating);
    const hasRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;

    if (!request.requester_confirmed_at) {
      db.prepare(
        `UPDATE requests
         SET requester_confirmed_at = datetime('now'), status = 'done', confirmed_by = 'requester',
             csat_rating = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(hasRating ? rating : null, request.id);
      db.prepare(
        "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'done', 'Người gửi xác nhận đã được hỗ trợ')"
      ).run(request.id);
    }

    const updated = db
      .prepare(`${TRACK_SELECT_BASE} WHERE requests.request_code = ?`)
      .get(req.params.code.trim().toUpperCase());
    res.json({ ...updated, history: getRequestHistory(request.id) });
  })
);

publicRouter.post(
  '/track/:code/reject',
  trackRequestLimiter,
  asyncHandler(async (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 3) {
      return res.status(400).json({ error: 'Vui lòng cho biết lý do chưa hài lòng.' });
    }

    const request = db
      .prepare(`${TRACK_SELECT_BASE} WHERE requests.request_code = ?`)
      .get(req.params.code.trim().toUpperCase());
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã này.' });
    if (request.status !== 'resolved_pending') {
      return res.status(400).json({ error: 'Yêu cầu này chưa ở trạng thái chờ xác nhận.' });
    }

    const nextRejectCount = request.reject_count + 1;
    const escalate = nextRejectCount >= 2;

    db.prepare(
      `UPDATE requests
       SET status = 'reopened', reject_count = ?, escalated_at = ${escalate ? "COALESCE(escalated_at, datetime('now'))" : 'escalated_at'},
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(nextRejectCount, request.id);

    db.prepare(
      "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'reopened', ?)"
    ).run(request.id, reason);

    const updatedForEmail = db.prepare('SELECT * FROM requests WHERE id = ?').get(request.id);
    await sendReopenedNotificationEmail(updatedForEmail, reason, escalate);

    const updated = db
      .prepare(`${TRACK_SELECT_BASE} WHERE requests.request_code = ?`)
      .get(req.params.code.trim().toUpperCase());
    res.json({ ...updated, history: getRequestHistory(request.id) });
  })
);

const AI_CONTEXT_SELECT = `
  SELECT requests.id, requests.description, requests.ai_suggestion, requests.ai_alternative_suggestion,
         requests.ai_resolved, requests.ai_rating,
         departments.name AS department_name, request_types.name AS request_type_name
  FROM requests
  LEFT JOIN departments ON departments.id = requests.department_id
  LEFT JOIN request_types ON request_types.id = requests.request_type_id
  WHERE requests.request_code = ?
`;

function getAttachmentsFor(requestId) {
  return db
    .prepare('SELECT stored_name, mime_type FROM request_attachments WHERE request_id = ?')
    .all(requestId);
}

// Gợi ý khắc phục ban đầu từ AI (Gemini) — gọi ngay sau khi người gửi tạo yêu cầu thành công.
// Idempotent: nếu đã có gợi ý (đã gọi trước đó), trả lại luôn, không gọi lại Gemini.
publicRouter.post(
  '/requests/:code/ai-suggestion',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const request = db.prepare(AI_CONTEXT_SELECT).get(code);
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã này.' });

    if (request.ai_suggestion) {
      return res.json({ suggestion: request.ai_suggestion, configured: true });
    }
    if (!isGeminiConfigured()) {
      return res.json({ suggestion: null, configured: false });
    }

    try {
      const suggestion = await getInitialSuggestion({
        requestId: request.id,
        description: request.description,
        departmentName: request.department_name,
        requestTypeName: request.request_type_name,
        attachments: getAttachmentsFor(request.id),
      });
      if (suggestion) {
        db.prepare('UPDATE requests SET ai_suggestion = ? WHERE id = ?').run(suggestion, request.id);
      }
      res.json({ suggestion, configured: true });
    } catch (err) {
      console.error('[ai] Lỗi khi gọi Gemini:', err.message);
      res.json({ suggestion: null, configured: true, error: true });
    }
  })
);

// Phản hồi của người gửi sau khi xem gợi ý: đã khắc phục được hay chưa.
// Nếu chưa, xin AI đưa ra hướng khác (chỉ 1 lần, idempotent như trên).
publicRouter.post(
  '/requests/:code/ai-feedback',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { resolved } = req.body || {};
    if (typeof resolved !== 'boolean') {
      return res.status(400).json({ error: 'Thiếu thông tin phản hồi.' });
    }

    const request = db.prepare(AI_CONTEXT_SELECT).get(code);
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã này.' });

    db.prepare('UPDATE requests SET ai_resolved = ? WHERE id = ?').run(resolved ? 1 : 0, request.id);

    if (resolved) {
      db.prepare("UPDATE requests SET status = 'done', updated_at = datetime('now') WHERE id = ?").run(
        request.id
      );
      db.prepare(
        "INSERT INTO request_status_history (request_id, status, note) VALUES (?, 'done', 'Người gửi xác nhận đã khắc phục được theo gợi ý của Trợ lý AI')"
      ).run(request.id);
      return res.json({ ok: true });
    }

    if (request.ai_alternative_suggestion) {
      return res.json({ suggestion: request.ai_alternative_suggestion });
    }
    if (!isGeminiConfigured() || !request.ai_suggestion) {
      return res.json({ suggestion: null });
    }

    try {
      const suggestion = await getAlternativeSuggestion({
        requestId: request.id,
        description: request.description,
        departmentName: request.department_name,
        requestTypeName: request.request_type_name,
        attachments: getAttachmentsFor(request.id),
        previousSuggestion: request.ai_suggestion,
      });
      if (suggestion) {
        db.prepare('UPDATE requests SET ai_alternative_suggestion = ? WHERE id = ?').run(suggestion, request.id);
      }
      res.json({ suggestion });
    } catch (err) {
      console.error('[ai] Lỗi khi gọi Gemini (phương án khác):', err.message);
      res.json({ suggestion: null, error: true });
    }
  })
);

publicRouter.post(
  '/requests/:code/ai-rating',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Đánh giá không hợp lệ.' });
    }

    const info = db.prepare('UPDATE requests SET ai_rating = ? WHERE request_code = ?').run(rating, code);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã này.' });

    res.json({ ok: true });
  })
);

// Trò chuyện tự do với AI về yêu cầu này — client tự giữ lịch sử hội thoại và gửi kèm mỗi lần
// (server không lưu transcript), để người gửi có thể hỏi thêm/phản hồi qua lại với AI.
publicRouter.post(
  '/requests/:code/ai-chat',
  aiChatLimiter,
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { message, history } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Nội dung quá dài.' });
    }

    const request = db.prepare(AI_CONTEXT_SELECT).get(code);
    if (!request) return res.status(404).json({ error: 'Không tìm thấy yêu cầu với mã này.' });
    if (!isGeminiConfigured()) {
      return res.json({ reply: null });
    }

    try {
      const reply = await getChatReply({
        requestId: request.id,
        description: request.description,
        departmentName: request.department_name,
        requestTypeName: request.request_type_name,
        attachments: getAttachmentsFor(request.id),
        history: Array.isArray(history) ? history.slice(-20) : [],
        userMessage: message.trim(),
      });
      res.json({ reply });
    } catch (err) {
      console.error('[ai] Lỗi khi gọi Gemini (chat):', err.message);
      res.json({ reply: null, error: true });
    }
  })
);
