import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { logAudit, diffAndLog } from '../services/audit.service.js';

export const adminFaqRouter = Router();
adminFaqRouter.use(requireAdmin);

const LIST_SELECT = `
  SELECT faq_entries.*, request_types.name AS request_type_name,
         requests.request_code AS source_request_code
  FROM faq_entries
  LEFT JOIN request_types ON request_types.id = faq_entries.request_type_id
  LEFT JOIN requests ON requests.id = faq_entries.source_request_id
`;

adminFaqRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const params = [];
    let where = '';
    if (q) {
      where = 'WHERE (faq_entries.question LIKE ? OR faq_entries.answer LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    const rows = db
      .prepare(`${LIST_SELECT} ${where} ORDER BY faq_entries.created_at DESC`)
      .all(...params);
    res.json(rows);
  })
);

adminFaqRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { question, answer, requestTypeId, sourceRequestId } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });
    }
    if (!answer || !String(answer).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập câu trả lời.' });
    }

    const info = db
      .prepare(
        `INSERT INTO faq_entries (question, answer, request_type_id, source_request_id)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        String(question).trim(),
        String(answer).trim(),
        requestTypeId || null,
        sourceRequestId || null
      );

    logAudit({
      actorId: req.session.adminId,
      requestId: sourceRequestId || null,
      action: 'faq_change',
      fieldName: 'faq_entries.created',
      newValue: String(question).trim(),
    });

    res.status(201).json({ id: info.lastInsertRowid });
  })
);

adminFaqRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM faq_entries WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });

    const { question, answer, requestTypeId, active } = req.body || {};
    const next = {
      question: question !== undefined ? String(question).trim() : existing.question,
      answer: answer !== undefined ? String(answer).trim() : existing.answer,
      requestTypeId: requestTypeId !== undefined ? requestTypeId || null : existing.request_type_id,
      active: active !== undefined ? (active ? 1 : 0) : existing.active,
    };

    if (!next.question || !next.answer) {
      return res.status(400).json({ error: 'Câu hỏi và câu trả lời không được để trống.' });
    }

    db.prepare(
      `UPDATE faq_entries
       SET question = ?, answer = ?, request_type_id = ?, active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(next.question, next.answer, next.requestTypeId, next.active, req.params.id);

    diffAndLog({
      actorId: req.session.adminId,
      requestId: existing.source_request_id,
      action: 'faq_change',
      oldRow: { question: existing.question, answer: existing.answer, requestTypeId: existing.request_type_id, active: existing.active },
      newRow: next,
      fields: ['question', 'answer', 'requestTypeId', 'active'],
    });

    res.json({ ok: true });
  })
);

adminFaqRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT question FROM faq_entries WHERE id = ?').get(req.params.id);
    const info = db.prepare('DELETE FROM faq_entries WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
    logAudit({
      actorId: req.session.adminId,
      action: 'faq_change',
      fieldName: 'faq_entries.deleted',
      oldValue: existing?.question,
    });
    res.json({ ok: true });
  })
);
