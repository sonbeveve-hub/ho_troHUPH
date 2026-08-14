import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/requireAdmin.js';
import { logAudit, diffAndLog } from '../services/audit.service.js';

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAdmin, requireSuperAdmin);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

adminUsersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        'SELECT id, username, full_name, email, role, status, last_login_at, created_at FROM admin_users ORDER BY created_at ASC'
      )
      .all();
    res.json(rows);
  })
);

adminUsersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { fullName, email, password, role } = req.body || {};
    const errors = [];
    if (!fullName || !String(fullName).trim()) errors.push('Vui lòng nhập họ tên.');
    if (!email || !EMAIL_RE.test(String(email).trim())) errors.push('Vui lòng nhập email hợp lệ.');
    if (!password || String(password).length < 8) errors.push('Mật khẩu cần ít nhất 8 ký tự.');
    if (!['super_admin', 'admin', 'handler'].includes(role)) errors.push('Vai trò không hợp lệ.');
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const trimmedEmail = String(email).trim();
    const passwordHash = await bcrypt.hash(String(password), 10);

    try {
      const info = db
        .prepare(
          `INSERT INTO admin_users (username, password_hash, full_name, email, role, status)
           VALUES (?, ?, ?, ?, ?, 'active')`
        )
        .run(trimmedEmail, passwordHash, String(fullName).trim(), trimmedEmail, role);

      logAudit({
        actorId: req.session.adminId,
        action: 'user_create',
        newValue: `${String(fullName).trim()} (${trimmedEmail}, ${role})`,
      });

      res.status(201).json({ id: info.lastInsertRowid });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email này đã được dùng cho tài khoản khác.' });
      }
      throw err;
    }
  })
);

adminUsersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });

    const { fullName, role, status } = req.body || {};

    if (Number(req.params.id) === req.session.adminId && status === 'disabled') {
      return res.status(400).json({ error: 'Không thể tự khoá tài khoản đang đăng nhập.' });
    }
    if (role !== undefined && !['super_admin', 'admin', 'handler'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    }
    if (status !== undefined && !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    }

    const next = {
      full_name: fullName !== undefined ? String(fullName).trim() : existing.full_name,
      role: role !== undefined ? role : existing.role,
      status: status !== undefined ? status : existing.status,
    };

    db.prepare('UPDATE admin_users SET full_name = ?, role = ?, status = ? WHERE id = ?').run(
      next.full_name,
      next.role,
      next.status,
      req.params.id
    );

    diffAndLog({
      actorId: req.session.adminId,
      action: 'user_update',
      oldRow: existing,
      newRow: { full_name: next.full_name, role: next.role, status: next.status },
      fields: ['full_name', 'role', 'status'],
    });

    res.json({ ok: true });
  })
);
