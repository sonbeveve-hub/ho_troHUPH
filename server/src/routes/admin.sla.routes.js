import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireFullAdmin } from '../middleware/requireAdmin.js';
import { logAudit, diffAndLog } from '../services/audit.service.js';

export const adminSlaRouter = Router();
adminSlaRouter.use(requireAdmin, requireFullAdmin);

const PRIORITY_VALUES = new Set(['P1', 'P2', 'P3', 'P4']);

const LIST_SELECT = `
  SELECT sla_rules.*, request_types.name AS request_type_name
  FROM sla_rules
  LEFT JOIN request_types ON request_types.id = sla_rules.request_type_id
`;

adminSlaRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = db.prepare(`${LIST_SELECT} ORDER BY sla_rules.id DESC`).all();
    res.json(rows);
  })
);

adminSlaRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { requestTypeId, priority, reminderDays, timeoutDays } = req.body || {};
    const errors = [];
    if (!requestTypeId) errors.push('Vui lòng chọn loại yêu cầu.');
    if (priority && !PRIORITY_VALUES.has(priority)) errors.push('Mức độ ưu tiên không hợp lệ.');
    if (!Number.isInteger(Number(reminderDays)) || Number(reminderDays) < 1) {
      errors.push('Số ngày nhắc nhở phải là số nguyên dương.');
    }
    if (!Number.isInteger(Number(timeoutDays)) || Number(timeoutDays) < 1) {
      errors.push('Số ngày tự đóng phải là số nguyên dương.');
    }
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    try {
      const info = db
        .prepare(
          `INSERT INTO sla_rules (request_type_id, priority, reminder_days, timeout_days)
           VALUES (?, ?, ?, ?)`
        )
        .run(Number(requestTypeId), priority || null, Number(reminderDays), Number(timeoutDays));
      logAudit({
        actorId: req.session.adminId,
        action: 'sla_rule_change',
        fieldName: 'sla_rules.created',
        newValue: `type=${requestTypeId} priority=${priority || 'any'} reminder=${reminderDays} timeout=${timeoutDays}`,
      });
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Đã có rule cho tổ hợp loại yêu cầu + mức ưu tiên này.' });
      }
      throw err;
    }
  })
);

adminSlaRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM sla_rules WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });

    const { reminderDays, timeoutDays } = req.body || {};
    const next = {
      reminder_days: reminderDays !== undefined ? Number(reminderDays) : existing.reminder_days,
      timeout_days: timeoutDays !== undefined ? Number(timeoutDays) : existing.timeout_days,
    };
    if (!Number.isInteger(next.reminder_days) || next.reminder_days < 1) {
      return res.status(400).json({ error: 'Số ngày nhắc nhở phải là số nguyên dương.' });
    }
    if (!Number.isInteger(next.timeout_days) || next.timeout_days < 1) {
      return res.status(400).json({ error: 'Số ngày tự đóng phải là số nguyên dương.' });
    }

    db.prepare(
      "UPDATE sla_rules SET reminder_days = ?, timeout_days = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(next.reminder_days, next.timeout_days, req.params.id);

    diffAndLog({
      actorId: req.session.adminId,
      action: 'sla_rule_change',
      oldRow: existing,
      newRow: next,
      fields: ['reminder_days', 'timeout_days'],
    });

    res.json({ ok: true });
  })
);

adminSlaRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const info = db.prepare('DELETE FROM sla_rules WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
    logAudit({ actorId: req.session.adminId, action: 'sla_rule_change', fieldName: 'sla_rules.deleted' });
    res.json({ ok: true });
  })
);
