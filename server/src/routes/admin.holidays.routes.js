import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { logAudit } from '../services/audit.service.js';
import { importHolidaysFromExcel } from '../services/excelImport.service.js';

export const adminHolidaysRouter = Router();
adminHolidaysRouter.use(requireAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

adminHolidaysRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = db.prepare('SELECT * FROM holidays ORDER BY recurring DESC, date ASC').all();
    res.json(rows);
  })
);

adminHolidaysRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, name, recurring } = req.body || {};
    if (!date || !/^(\d{4}-)?\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Ngày không hợp lệ — dùng MM-DD (lặp lại) hoặc YYYY-MM-DD.' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên ngày nghỉ.' });
    }
    const info = db
      .prepare('INSERT INTO holidays (date, name, recurring) VALUES (?, ?, ?)')
      .run(date, String(name).trim(), recurring ? 1 : 0);
    logAudit({
      actorId: req.session.adminId,
      action: 'holiday_change',
      fieldName: 'holidays.created',
      newValue: `${date} — ${String(name).trim()}`,
    });
    res.status(201).json({ id: info.lastInsertRowid });
  })
);

adminHolidaysRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT date, name FROM holidays WHERE id = ?').get(req.params.id);
    const info = db.prepare('DELETE FROM holidays WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
    logAudit({
      actorId: req.session.adminId,
      action: 'holiday_change',
      fieldName: 'holidays.deleted',
      oldValue: existing ? `${existing.date} — ${existing.name}` : undefined,
    });
    res.json({ ok: true });
  })
);

adminHolidaysRouter.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn file Excel.' });
    const result = importHolidaysFromExcel(req.file.buffer);
    res.json(result);
  })
);
