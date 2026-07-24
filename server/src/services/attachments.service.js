import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, '../../data/uploads');

function safeExtension(originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return /^\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/.test(ext) ? ext : '';
}

export function saveRequestAttachments(requestId, files) {
  if (!files || files.length === 0) return [];

  const dir = path.join(uploadsDir, String(requestId));
  fs.mkdirSync(dir, { recursive: true });

  const insertAttachment = db.prepare(`
    INSERT INTO request_attachments (request_id, stored_name, original_name, mime_type, size_bytes)
    VALUES (?, ?, ?, ?, ?)
  `);

  return files.map((file) => {
    const storedName = `${crypto.randomUUID()}${safeExtension(file.originalname)}`;
    fs.writeFileSync(path.join(dir, storedName), file.buffer);
    const info = insertAttachment.run(
      requestId,
      storedName,
      file.originalname,
      file.mimetype,
      file.size
    );
    return { id: info.lastInsertRowid, storedName, originalName: file.originalname };
  });
}

export function getAttachmentFilePath(requestId, storedName) {
  return path.join(uploadsDir, String(requestId), storedName);
}
