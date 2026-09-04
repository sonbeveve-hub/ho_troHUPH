import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireFullAdmin, requireSuperAdmin } from '../middleware/requireAdmin.js';
import { logAudit, diffAndLog } from '../services/audit.service.js';

export const adminAssigneesRouter = Router();
adminAssigneesRouter.use(requireAdmin, requireFullAdmin);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tài khoản đăng nhập của người phụ trách được xác định bằng cách khớp email
// (assignees.email = admin_users.username) — cùng cách làm với staff, tránh phải đồng bộ 2 nơi.
adminAssigneesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await db.all(
      `SELECT assignees.*, admin_users.role AS account_role, admin_users.status AS account_status
       FROM assignees
       LEFT JOIN admin_users ON admin_users.username = assignees.email
       ORDER BY assignees.name`
    );
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

    const info = await db.run(
      'INSERT INTO assignees (name, email, phone) VALUES (?, ?, ?) RETURNING id',
      [String(name).trim(), String(email).trim(), phone ? String(phone).trim() : null]
    );
    await logAudit({
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
    const existing = await db.get('SELECT * FROM assignees WHERE id = ?', [req.params.id]);
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

    await db.run('UPDATE assignees SET name = ?, email = ?, phone = ?, active = ? WHERE id = ?', [
      next.name,
      next.email,
      next.phone,
      next.active,
      req.params.id,
    ]);

    await diffAndLog({
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
    const existing = await db.get('SELECT name FROM assignees WHERE id = ?', [req.params.id]);
    const info = await db.run('DELETE FROM assignees WHERE id = ?', [req.params.id]);
    if (info.changes === 0) return res.status(404).json({ error: 'Không tìm thấy.' });
    await logAudit({
      actorId: req.session.adminId,
      action: 'assignee_change',
      fieldName: 'assignees.deleted',
      oldValue: existing?.name,
    });
    res.json({ ok: true });
  })
);

// Cấp tài khoản đăng nhập cho người phụ trách — dùng đúng email trong danh sách làm username.
// Chỉ super_admin (tạo tài khoản/đặt mật khẩu là thao tác nhạy cảm, giống hệt /admin/staff).
adminAssigneesRouter.post(
  '/:id/grant-account',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const assignee = await db.get('SELECT * FROM assignees WHERE id = ?', [req.params.id]);
    if (!assignee) return res.status(404).json({ error: 'Không tìm thấy người phụ trách.' });
    if (!assignee.email || !EMAIL_RE.test(assignee.email)) {
      return res.status(400).json({ error: 'Người phụ trách cần có email hợp lệ trước khi cấp tài khoản.' });
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
        [assignee.email, passwordHash, assignee.name, assignee.email, role]
      );

      await logAudit({
        actorId: req.session.adminId,
        action: 'user_create',
        newValue: `${assignee.name} (${assignee.email}, ${role}) — cấp từ danh sách người phụ trách #${assignee.id}`,
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

// Sửa vai trò/trạng thái/mật khẩu của tài khoản đã cấp cho người phụ trách — khớp qua email.
adminAssigneesRouter.patch(
  '/:id/account',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const assignee = await db.get('SELECT * FROM assignees WHERE id = ?', [req.params.id]);
    if (!assignee) return res.status(404).json({ error: 'Không tìm thấy người phụ trách.' });
    if (!assignee.email) return res.status(400).json({ error: 'Người phụ trách chưa có email.' });

    const account = await db.get('SELECT * FROM admin_users WHERE username = ?', [assignee.email]);
    if (!account) return res.status(404).json({ error: 'Người phụ trách này chưa có tài khoản đăng nhập.' });

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
      await logAudit({ actorId: req.session.adminId, action: 'user_password_reset', newValue: assignee.email });
    }

    res.json({ ok: true });
  })
);
