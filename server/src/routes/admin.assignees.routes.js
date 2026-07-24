import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export const adminAssigneesRouter = Router();
adminAssigneesRouter.use(requireAdmin);

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

    db.prepare('UPDATE assignees SET name = ?, email = ?, phone = ?, active = ? WHERE id = ?').run(
      nextName,
      nextEmail,
      phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      req.params.id
    );
    res.json({ ok: true });
  })
);

adminAssigneesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const info = db.prepare('DELETE FROM assignees WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
    res.json({ ok: true });
  })
);
