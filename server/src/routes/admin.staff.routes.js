import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { normalizeText } from '../utils/normalizeText.js';
import { importStaffFromExcel } from '../services/excelImport.service.js';

export const adminStaffRouter = Router();
adminStaffRouter.use(requireAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const PAGE_SIZE = 30;

adminStaffRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, department_id: departmentId } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);

    const conditions = [];
    const params = [];
    if (q) {
      conditions.push('staff.normalized_name LIKE ?');
      params.push(`%${normalizeText(q)}%`);
    }
    if (departmentId) {
      conditions.push('staff.department_id = ?');
      params.push(departmentId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) AS count FROM staff ${where}`).get(...params).count;
    const rows = db
      .prepare(
        `SELECT staff.*, departments.name AS department_name
         FROM staff LEFT JOIN departments ON departments.id = staff.department_id
         ${where} ORDER BY staff.name LIMIT ? OFFSET ?`
      )
      .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);

    res.json({ data: rows, page, pageSize: PAGE_SIZE, total });
  })
);

adminStaffRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, departmentId } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên.' });
    }
    const info = db
      .prepare('INSERT INTO staff (name, normalized_name, email, department_id) VALUES (?, ?, ?, ?)')
      .run(String(name).trim(), normalizeText(name), email || null, departmentId || null);
    res.status(201).json({ id: info.lastInsertRowid });
  })
);

adminStaffRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });

    const { name, email, departmentId } = req.body || {};
    const nextName = name !== undefined ? String(name).trim() : existing.name;

    db.prepare(
      `UPDATE staff SET name = ?, normalized_name = ?, email = ?, department_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      nextName,
      normalizeText(nextName),
      email !== undefined ? email : existing.email,
      departmentId !== undefined ? departmentId : existing.department_id,
      req.params.id
    );
    res.json({ ok: true });
  })
);

adminStaffRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  })
);

adminStaffRouter.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn file Excel.' });
    const result = importStaffFromExcel(req.file.buffer);
    res.json(result);
  })
);
