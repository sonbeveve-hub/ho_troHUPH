import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireFullAdmin, requireSuperAdmin } from '../middleware/requireAdmin.js';
import { normalizeText } from '../utils/normalizeText.js';
import { importStaffFromExcel } from '../services/excelImport.service.js';
import { logAudit, diffAndLog } from '../services/audit.service.js';

export const adminStaffRouter = Router();
adminStaffRouter.use(requireAdmin, requireFullAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const PAGE_SIZE = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tài khoản đăng nhập của nhân sự được xác định bằng cách khớp email (staff.email =
// admin_users.username) — không thêm cột FK riêng, vì email vốn đã là định danh dùng chung
// giữa 2 bảng và tránh phải đồng bộ 2 nơi khi 1 trong 2 đổi email.
adminStaffRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, department_id: departmentId } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);

    const conditions = [];
    const params = [];
    if (q) {
      conditions.push('staff.normalized_name ILIKE ?');
      params.push(`%${normalizeText(q)}%`);
    }
    if (departmentId) {
      conditions.push('staff.department_id = ?');
      params.push(departmentId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (await db.get(`SELECT COUNT(*) AS count FROM staff ${where}`, params)).count;
    const rows = await db.all(
      `SELECT staff.*, departments.name AS department_name,
              admin_users.role AS account_role, admin_users.status AS account_status
       FROM staff
       LEFT JOIN departments ON departments.id = staff.department_id
       LEFT JOIN admin_users ON admin_users.username = staff.email AND staff.email IS NOT NULL
       ${where} ORDER BY staff.name LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    );

    res.json({ data: rows, page, pageSize: PAGE_SIZE, total });
  })
);

adminStaffRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, phone, departmentId } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên.' });
    }
    const info = await db.run(
      'INSERT INTO staff (name, normalized_name, email, phone, department_id) VALUES (?, ?, ?, ?, ?) RETURNING id',
      [String(name).trim(), normalizeText(name), email || null, phone || null, departmentId || null]
    );
    res.status(201).json({ id: info.lastInsertRowid });
  })
);

adminStaffRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await db.get('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy.' });

    const { name, email, phone, departmentId } = req.body || {};
    const nextName = name !== undefined ? String(name).trim() : existing.name;

    await db.run(
      `UPDATE staff SET name = ?, normalized_name = ?, email = ?, phone = ?, department_id = ?, updated_at = now() WHERE id = ?`,
      [
        nextName,
        normalizeText(nextName),
        email !== undefined ? email : existing.email,
        phone !== undefined ? phone : existing.phone,
        departmentId !== undefined ? departmentId : existing.department_id,
        req.params.id,
      ]
    );
    res.json({ ok: true });
  })
);

adminStaffRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await db.run('DELETE FROM staff WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  })
);

adminStaffRouter.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn file Excel.' });
    const result = await importStaffFromExcel(req.file.buffer);
    res.json(result);
  })
);

// Cấp tài khoản đăng nhập cho nhân sự — dùng đúng email trong hồ sơ nhân sự làm username,
// không cho nhập email khác để tránh lệch dữ liệu giữa 2 bảng. Chỉ super_admin (tạo tài
// khoản/đặt mật khẩu là thao tác nhạy cảm, giống hệt mức yêu cầu ở /admin/users).
adminStaffRouter.post(
  '/:id/grant-account',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const staff = await db.get('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    if (!staff) return res.status(404).json({ error: 'Không tìm thấy nhân sự.' });
    if (!staff.email || !EMAIL_RE.test(staff.email)) {
      return res.status(400).json({ error: 'Nhân sự cần có email hợp lệ trước khi cấp tài khoản.' });
    }

    const { role, password } = req.body || {};
    if (!['super_admin', 'admin', 'handler'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Mật khẩu cần ít nhất 8 ký tự.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    try {
      const info = await db.run(
        `INSERT INTO admin_users (username, password_hash, full_name, email, role, status)
         VALUES (?, ?, ?, ?, ?, 'active') RETURNING id`,
        [staff.email, passwordHash, staff.name, staff.email, role]
      );

      await logAudit({
        actorId: req.session.adminId,
        action: 'user_create',
        newValue: `${staff.name} (${staff.email}, ${role}) — cấp từ hồ sơ nhân sự #${staff.id}`,
      });

      res.status(201).json({ id: info.lastInsertRowid });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email này đã có tài khoản đăng nhập.' });
      }
      throw err;
    }
  })
);

// Sửa vai trò/trạng thái/mật khẩu của tài khoản đã cấp cho nhân sự — khớp qua email, không
// cần biết trước admin_users.id.
adminStaffRouter.patch(
  '/:id/account',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const staff = await db.get('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    if (!staff) return res.status(404).json({ error: 'Không tìm thấy nhân sự.' });
    if (!staff.email) return res.status(400).json({ error: 'Nhân sự chưa có email.' });

    const account = await db.get('SELECT * FROM admin_users WHERE username = ?', [staff.email]);
    if (!account) return res.status(404).json({ error: 'Nhân sự này chưa có tài khoản đăng nhập.' });

    const { role, status, password } = req.body || {};
    if (role !== undefined && !['super_admin', 'admin', 'handler'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    }
    if (status !== undefined && !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    }
    if (password !== undefined && String(password).length < 8) {
      return res.status(400).json({ error: 'Mật khẩu cần ít nhất 8 ký tự.' });
    }
    if (account.id === req.session.adminId && status === 'disabled') {
      return res.status(400).json({ error: 'Không thể tự khoá tài khoản đang đăng nhập.' });
    }

    const next = {
      role: role !== undefined ? role : account.role,
      status: status !== undefined ? status : account.status,
    };

    if (password) {
      const passwordHash = await bcrypt.hash(String(password), 10);
      await db.run('UPDATE admin_users SET role = ?, status = ?, password_hash = ? WHERE id = ?', [
        next.role,
        next.status,
        passwordHash,
        account.id,
      ]);
    } else {
      await db.run('UPDATE admin_users SET role = ?, status = ? WHERE id = ?', [
        next.role,
        next.status,
        account.id,
      ]);
    }

    await diffAndLog({
      actorId: req.session.adminId,
      action: 'user_update',
      oldRow: { role: account.role, status: account.status },
      newRow: next,
      fields: ['role', 'status'],
    });
    if (password) {
      await logAudit({ actorId: req.session.adminId, action: 'user_password_reset', newValue: staff.email });
    }

    res.json({ ok: true });
  })
);
