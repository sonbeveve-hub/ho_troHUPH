import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../db/index.js';

function safeExtension(originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return /^\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/.test(ext) ? ext : '';
}

// Nội dung ảnh lưu vào cột request_attachments.data (BYTEA) thay vì server/data/uploads/ —
// trên Vercel (serverless) không có ổ đĩa lâu dài, file ghi ra đĩa sẽ mất sau mỗi lần gọi.
// stored_name vẫn giữ (tên ngẫu nhiên + đuôi file) để không phải đổi schema/route cũ.
export async function saveRequestAttachments(requestId, files) {
  if (!files || files.length === 0) return [];

  const saved = [];
  for (const file of files) {
    const storedName = `${crypto.randomUUID()}${safeExtension(file.originalname)}`;
    const info = await db.run(
      `INSERT INTO request_attachments (request_id, stored_name, original_name, mime_type, size_bytes, data)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [requestId, storedName, file.originalname, file.mimetype, file.size, file.buffer]
    );
    saved.push({ id: info.lastInsertRowid, storedName, originalName: file.originalname });
  }
  return saved;
}
