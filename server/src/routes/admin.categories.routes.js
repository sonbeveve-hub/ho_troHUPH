import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  importDepartmentsFromExcel,
  importRequestTypesFromExcel,
  importProcessingTimesFromExcel,
} from '../services/excelImport.service.js';

export const adminCategoriesRouter = Router();
adminCategoriesRouter.use(requireAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function registerCategoryRoutes(router, path, table, hasDescription, importFn) {
  router.get(
    path,
    asyncHandler(async (req, res) => {
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY sort_order, id`).all();
      res.json(rows);
    })
  );

  router.post(
    path,
    asyncHandler(async (req, res) => {
      const { name, description } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên.' });
      }
      const nextSortOrder = db
        .prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ${table}`)
        .get().next;
      try {
        const info = hasDescription
          ? db
              .prepare(`INSERT INTO ${table} (name, description, sort_order) VALUES (?, ?, ?)`)
              .run(String(name).trim(), description || null, nextSortOrder)
          : db
              .prepare(`INSERT INTO ${table} (name, sort_order) VALUES (?, ?)`)
              .run(String(name).trim(), nextSortOrder);
        res.status(201).json({ id: info.lastInsertRowid });
      } catch (err) {
        if (String(err.message).includes('UNIQUE')) {
          return res.status(409).json({ error: 'Tên này đã tồn tại.' });
        }
        throw err;
      }
    })
  );

  router.patch(
    `${path}/:id/move`,
    asyncHandler(async (req, res) => {
      const { direction } = req.body || {};
      if (!['up', 'down'].includes(direction)) {
        return res.status(400).json({ error: 'Hướng di chuyển không hợp lệ.' });
      }

      const current = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
      if (!current) return res.status(404).json({ error: 'Không tìm thấy.' });

      const neighbor =
        direction === 'up'
          ? db
              .prepare(`SELECT * FROM ${table} WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1`)
              .get(current.sort_order)
          : db
              .prepare(`SELECT * FROM ${table} WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1`)
              .get(current.sort_order);

      if (neighbor) {
        db.transaction(() => {
          db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(neighbor.sort_order, current.id);
          db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(current.sort_order, neighbor.id);
        })();
      }

      res.json({ ok: true });
    })
  );

  router.patch(
    `${path}/:id`,
    asyncHandler(async (req, res) => {
      const { name, description, active } = req.body || {};
      const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });

      const next = {
        name: name !== undefined ? String(name).trim() : existing.name,
        description: hasDescription
          ? description !== undefined
            ? description
            : existing.description
          : undefined,
        active: active !== undefined ? (active ? 1 : 0) : existing.active,
      };

      if (hasDescription) {
        db.prepare(`UPDATE ${table} SET name = ?, description = ?, active = ? WHERE id = ?`).run(
          next.name,
          next.description,
          next.active,
          req.params.id
        );
      } else {
        db.prepare(`UPDATE ${table} SET name = ?, active = ? WHERE id = ?`).run(
          next.name,
          next.active,
          req.params.id
        );
      }
      res.json({ ok: true });
    })
  );

  router.delete(
    `${path}/:id`,
    asyncHandler(async (req, res) => {
      try {
        const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
        res.json({ ok: true });
      } catch (err) {
        if (String(err.message).includes('FOREIGN KEY')) {
          return res.status(409).json({
            error: 'Không thể xoá vì đang có yêu cầu sử dụng mục này. Hãy dùng "Vô hiệu hoá" thay thế.',
          });
        }
        throw err;
      }
    })
  );

  router.post(
    `${path}/import`,
    upload.single('file'),
    asyncHandler(async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn file Excel.' });
      const result = importFn(req.file.buffer);
      res.json(result);
    })
  );
}

registerCategoryRoutes(
  adminCategoriesRouter,
  '/departments',
  'departments',
  false,
  importDepartmentsFromExcel
);
registerCategoryRoutes(
  adminCategoriesRouter,
  '/request-types',
  'request_types',
  true,
  importRequestTypesFromExcel
);
registerCategoryRoutes(
  adminCategoriesRouter,
  '/processing-times',
  'processing_times',
  false,
  importProcessingTimesFromExcel
);
