import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireFullAdmin } from '../middleware/requireAdmin.js';
import { logAudit, diffAndLog } from '../services/audit.service.js';

export const adminAssigneesRouter = Router();
adminAssigneesRouter.use(requireAdmin, requireFullAdmin);

adminAssigneesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = db.prepare('SELECT * FROM assignees ORDER BY name').all();
    res.json(rows);
  })
);

adminAssigneesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, phone } = req.body || {};
    const errors = [];
    if (!name || !String(name).trim()) errors.push('Vui lòng nhập tên.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      errors.push('Vui lòng nhập email hợp lệ.');
    }
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const info = db
      .prepare('INSERT INTO assignees (name, email, phone) VALUES (?, ?, ?)')
      .run(String(name).trim(), String(email).trim(), phone ? String(phone).trim() : null);
    logAudit({
      actorId: req.session.adminId,
      action: 'assignee_change',
      fieldName: 'assignees.created',
      newValue: `${String(name).trim()} (${String(email).trim()})`,
    });
    res.status(201).json({ id: info.lastInsertRowid });
  })
);

adminAssigneesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM assignees WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });

    const { name, email, phone, active } = req.body || {};
    const nextName = name !== undefined ? String(name).trim() : existing.name;
    const nextEmail = email !== undefined ? String(email).trim() : existing.email;

    if (!nextName) return res.status(400).json({ error: 'Vui lòng nhập tên.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return res.status(400).json({ error: 'Vui lòng nhập email hợp lệ.' });
    }

    const next = {
      name: nextName,
      email: nextEmail,
      phone: phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
      active: active !== undefined ? (active ? 1 : 0) : existing.active,
    };

    db.prepare('UPDATE assignees SET name = ?, email = ?, phone = ?, active = ? WHERE id = ?').run(
      next.name,
      next.email,
      next.phone,
      next.active,
      req.params.id
    );

    diffAndLog({
      actorId: req.session.adminId,
      action: 'assignee_change',
      oldRow: existing,
      newRow: next,
      fields: ['name', 'email', 'phone', 'active'],
    });

    res.json({ ok: true });
  })
);

adminAssigneesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT name FROM assignees WHERE id = ?').get(req.params.id);
    const info = db.prepare('DELETE FROM assignees WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
    logAudit({
      actorId: req.session.adminId,
      action: 'assignee_change',
      fieldName: 'assignees.deleted',
      oldValue: existing?.name,
    });
    res.json({ ok: true });
  })
);
