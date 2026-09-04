import { Router } from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireFullAdmin } from '../middleware/requireAdmin.js';
import { logAudit } from '../services/audit.service.js';
import {
  importDepartmentsFromExcel,
  importRequestTypesFromExcel,
  importProcessingTimesFromExcel,
} from '../services/excelImport.service.js';

const PRIORITY_VALUES = new Set(['P1', 'P2', 'P3', 'P4']);

export const adminCategoriesRouter = Router();
adminCategoriesRouter.use(requireAdmin, requireFullAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function registerCategoryRoutes(router, path, table, hasDescription, importFn) {
  router.get(
    path,
    asyncHandler(async (req, res) => {
      const rows = await db.all(`SELECT * FROM ${table} ORDER BY sort_order, id`);
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
      const nextSortOrder = (
        await db.get(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ${table}`)
      ).next;
      try {
        const info = hasDescription
          ? await db.run(
              `INSERT INTO ${table} (name, description, sort_order) VALUES (?, ?, ?) RETURNING id`,
              [String(name).trim(), description || null, nextSortOrder]
            )
          : await db.run(`INSERT INTO ${table} (name, sort_order) VALUES (?, ?) RETURNING id`, [
              String(name).trim(),
              nextSortOrder,
            ]);
        await logAudit({
          actorId: req.session.adminId,
          action: 'category_change',
          fieldName: `${table}.created`,
          newValue: String(name).trim(),
        });
        res.status(201).json({ id: info.lastInsertRowid });
      } catch (err) {
        if (err.code === '23505') {
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

      const current = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!current) return res.status(404).json({ error: 'Không tìm thấy.' });

      const neighbor =
        direction === 'up'
          ? await db.get(
              `SELECT * FROM ${table} WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1`,
              [current.sort_order]
            )
          : await db.get(
              `SELECT * FROM ${table} WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1`,
              [current.sort_order]
            );

      if (neighbor) {
        await db.transaction(async (tx) => {
          await tx.run(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [
            neighbor.sort_order,
            current.id,
          ]);
          await tx.run(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [
            current.sort_order,
            neighbor.id,
          ]);
        });
      }

      res.json({ ok: true });
    })
  );

  router.patch(
    `${path}/:id`,
    asyncHandler(async (req, res) => {
      const { name, description, active } = req.body || {};
      const existing = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
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
        await db.run(`UPDATE ${table} SET name = ?, description = ?, active = ? WHERE id = ?`, [
          next.name,
          next.description,
          next.active,
          req.params.id,
        ]);
      } else {
        await db.run(`UPDATE ${table} SET name = ?, active = ? WHERE id = ?`, [
          next.name,
          next.active,
          req.params.id,
        ]);
      }
      const changedFields = ['name', 'active', ...(hasDescription ? ['description'] : [])];
      for (const field of changedFields) {
        if (existing[field] !== next[field]) {
          await logAudit({
            actorId: req.session.adminId,
            action: 'category_change',
            fieldName: `${table}.${field}`,
            oldValue: existing[field],
            newValue: next[field],
          });
        }
      }
      res.json({ ok: true });
    })
  );

  router.delete(
    `${path}/:id`,
    asyncHandler(async (req, res) => {
      try {
        const existing = await db.get(`SELECT name FROM ${table} WHERE id = ?`, [req.params.id]);
        const info = await db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
        if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
        await logAudit({
          actorId: req.session.adminId,
          action: 'category_change',
          fieldName: `${table}.deleted`,
          oldValue: existing?.name,
        });
        res.json({ ok: true });
      } catch (err) {
        // '23503' = foreign_key_violation (mã lỗi chuẩn Postgres), thay cho dò chuỗi
        // "FOREIGN KEY" trong message lỗi kiểu SQLite trước đây.
        if (err.code === '23503') {
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
      const result = await importFn(req.file.buffer);
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

// Mức độ ưu tiên mặc định cho 1 loại yêu cầu (tự động gán khi có request mới thuộc loại
// này) — field riêng của request_types, nằm ngoài registerCategoryRoutes dùng chung để
// không phải sửa helper chung cho cả 3 danh mục khác.
adminCategoriesRouter.patch(
  '/request-types/:id/default-priority',
  asyncHandler(async (req, res) => {
    const { defaultPriority } = req.body || {};
    if (!PRIORITY_VALUES.has(defaultPriority)) {
      return res.status(400).json({ error: 'Mức độ ưu tiên không hợp lệ.' });
    }
    const existing = await db.get('SELECT * FROM request_types WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });

    await db.run('UPDATE request_types SET default_priority = ? WHERE id = ?', [
      defaultPriority,
      req.params.id,
    ]);
    await logAudit({
      actorId: req.session.adminId,
      action: 'category_change',
      fieldName: 'request_types.default_priority',
      oldValue: existing.default_priority,
      newValue: defaultPriority,
    });
    res.json({ ok: true });
  })
);
