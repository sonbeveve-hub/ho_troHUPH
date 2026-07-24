import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    res.json({ id: admin.id, username: admin.username });
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
  res.json({ id: req.session.adminId, username: req.session.adminUsername });
});
