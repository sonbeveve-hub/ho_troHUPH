import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Thay cho 11 hàm "dò PRAGMA table_info rồi ALTER/dựng lại bảng" kiểu SQLite trước đây (chỉ cần
// vì SQLite không ALTER được CHECK constraint) — Postgres hỗ trợ ALTER TABLE ADD/DROP CONSTRAINT
// thật nên không cần dựng lại bảng nữa. schema.sql giờ là nguồn sự thật duy nhất cho trạng thái
// hiện tại (chạy mỗi lần khởi động, CREATE TABLE IF NOT EXISTS nên an toàn để chạy lại nhiều
// lần); thay đổi schema về sau thêm vào server/src/db/migrations/NNN_*.sql, không sửa lại
// schema.sql hay viết thêm hàm vá kiểu cũ.
export async function migrate() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schema);
  await runPendingMigrations();
}

async function runPendingMigrations() {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort(); // tên file bắt đầu bằng số 3 chữ số (001_, 002_...) nên sort chuỗi = sort số đúng

  if (files.length === 0) return;

  const applied = new Set((await db.all('SELECT version FROM schema_migrations')).map((r) => r.version));

  for (const file of files) {
    const version = Number(file.split('_')[0]);
    if (applied.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] Áp dụng ${file}...`);
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.run('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
    });
  }
}
