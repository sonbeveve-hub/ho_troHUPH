import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireFullAdmin } from '../middleware/requireAdmin.js';
import { logAudit } from '../services/audit.service.js';

export const adminFaqCandidatesRouter = Router();
adminFaqCandidatesRouter.use(requireAdmin, requireFullAdmin);

adminFaqCandidatesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? req.query.status
      : 'pending';
    const rows = await db.all(
      'SELECT * FROM faq_candidates WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
    res.json(rows.map((r) => ({ ...r, request_ids: JSON.parse(r.request_ids) })));
  })
);

adminFaqCandidatesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await db.get('SELECT * FROM faq_candidates WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Đề xuất này đã được xử lý.' });
    }

    const { question, answer } = req.body || {};
    const next = {
      question: question !== undefined ? String(question).trim() : existing.suggested_question,
      answer: answer !== undefined ? String(answer).trim() : existing.suggested_answer,
    };
    if (!next.question || !next.answer) {
      return res.status(400).json({ error: 'Câu hỏi và câu trả lời không được để trống.' });
    }

    await db.run('UPDATE faq_candidates SET suggested_question = ?, suggested_answer = ? WHERE id = ?', [
      next.question,
      next.answer,
      req.params.id,
    ]);
    res.json({ ok: true });
  })
);

adminFaqCandidatesRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const existing = await db.get('SELECT * FROM faq_candidates WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Đề xuất này đã được xử lý.' });
    }

    const requestIds = JSON.parse(existing.request_ids);
    const sourceRequestId = requestIds[0] || null;
    const sourceRequest = sourceRequestId
      ? await db.get('SELECT request_type_id FROM requests WHERE id = ?', [sourceRequestId])
      : null;

    const info = await db.run(
      `INSERT INTO faq_entries (question, answer, request_type_id, source_request_id)
       VALUES (?, ?, ?, ?) RETURNING id`,
      [existing.suggested_question, existing.suggested_answer, sourceRequest?.request_type_id || null, sourceRequestId]
    );

    await db.run(
      "UPDATE faq_candidates SET status = 'approved', reviewed_by = ?, reviewed_at = now() WHERE id = ?",
      [req.session.adminId, req.params.id]
    );

    await logAudit({
      actorId: req.session.adminId,
      action: 'faq_candidate_change',
      fieldName: 'faq_candidates.approved',
      newValue: existing.suggested_question,
    });

    res.json({ ok: true, faqEntryId: info.lastInsertRowid });
  })
);

adminFaqCandidatesRouter.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const existing = await db.get('SELECT * FROM faq_candidates WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: 'Đề xuất này đã được xử lý.' });
    }

    await db.run(
      "UPDATE faq_candidates SET status = 'rejected', reviewed_by = ?, reviewed_at = now() WHERE id = ?",
      [req.session.adminId, req.params.id]
    );

    await logAudit({
      actorId: req.session.adminId,
      action: 'faq_candidate_change',
      fieldName: 'faq_candidates.rejected',
      oldValue: existing.suggested_question,
    });

    res.json({ ok: true });
  })
);
