import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logAudit } from '../services/audit.service.js';

export const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.' });
    }

    const identifier = String(username).trim();
    const admin = await db.get('SELECT * FROM admin_users WHERE username = ? OR email = ?', [
      identifier,
      identifier,
    ]);
    if (!admin) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }
    if (admin.status !== 'active') {
      return res.status(401).json({ error: 'Tài khoản đã bị khoá.' });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    await db.run("UPDATE admin_users SET last_login_at = now() WHERE id = ?", [admin.id]);
    await logAudit({ actorId: admin.id, action: 'login' });

    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    req.session.adminRole = admin.role;
    req.session.adminFullName = admin.full_name;
    res.json({ id: admin.id, username: admin.username, role: admin.role, fullName: admin.full_name });
  })
);

adminAuthRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

adminAuthRouter.get('/me', (req, res) => {
  if (!req.session?.adminId) {
    return res.status(401).json({ error: 'Chưa đăng nhập.' });
  }
  res.json({
    id: req.session.adminId,
    username: req.session.adminUsername,
    role: req.session.adminRole,
    fullName: req.session.adminFullName,
  });
});
