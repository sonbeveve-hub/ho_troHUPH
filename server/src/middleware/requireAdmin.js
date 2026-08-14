import { db } from '../db/index.js';

// Xác nhận lại status='active' trên MỖI request (không chỉ lúc login) — để khoá tài khoản
// (status='disabled') có hiệu lực ngay cả với session đang mở, không phải đợi hết hạn cookie.
export function requireAdmin(req, res, next) {
  if (!req.session?.adminId) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập.' });
  }

  const admin = db
    .prepare('SELECT status FROM admin_users WHERE id = ?')
    .get(req.session.adminId);
  if (!admin || admin.status !== 'active') {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Tài khoản đã bị khoá hoặc không còn tồn tại.' });
  }

  next();
}

export function requireSuperAdmin(req, res, next) {
  if (req.session?.adminRole !== 'super_admin') {
    return res.status(403).json({ error: 'Chỉ quản trị viên cấp cao mới có quyền thao tác này.' });
  }
  next();
}

// Chặn role 'handler' (người phụ trách) khỏi các trang cấu hình hệ thống — danh mục, SLA,
// ngày nghỉ, nhân sự, người phụ trách, FAQ/đề xuất FAQ. Handler chỉ được vào Tổng quan +
// Yêu cầu (route requests dùng requireAdmin thường, không dùng middleware này).
export function requireFullAdmin(req, res, next) {
  if (req.session?.adminRole === 'handler') {
    return res.status(403).json({ error: 'Tài khoản người phụ trách không có quyền truy cập mục này.' });
  }
  next();
}
