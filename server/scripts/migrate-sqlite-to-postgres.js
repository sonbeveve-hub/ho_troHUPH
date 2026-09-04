// Công cụ CLI chạy TAY 1 LẦN lúc cutover thật sang PostgreSQL — không phải phần app tự động
// chạy, không import ở bất kỳ đâu khác trong codebase. Đọc dữ liệu từ server/data/app.db
// (SQLite, chỉ đọc) và ghi vào PostgreSQL (DATABASE_URL), giữ nguyên toàn bộ id gốc để không
// đứt các khoá ngoại giữa các bảng.
//
// Cách chạy:
//   DATABASE_URL=postgresql://... node server/scripts/migrate-sqlite-to-postgres.js [đường dẫn app.db]
//
// An toàn: từ chối chạy nếu Postgres đích ĐÃ có dữ liệu (tránh chèn trùng nếu lỡ chạy 2 lần).
// Toàn bộ việc ghi nằm trong 1 transaction — lỗi ở bất kỳ đâu thì ROLLBACK sạch, không để lại
// dữ liệu nửa vời.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sqliteDbPath = process.argv[2] || path.resolve(__dirname, '../data/app.db');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Thiếu biến môi trường DATABASE_URL.');
  process.exit(1);
}

// Thứ tự bắt buộc theo phụ thuộc khoá ngoại: bảng cha luôn ghi TRƯỚC bảng con tham chiếu tới nó
// (giống thứ tự đã sắp trong server/src/db/schema.sql).
const TABLES = [
  {
    name: 'departments',
    columns: ['id', 'name', 'active', 'sort_order', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'request_types',
    columns: ['id', 'name', 'description', 'active', 'sort_order', 'default_priority', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'processing_times',
    columns: ['id', 'name', 'active', 'sort_order', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'assignees',
    columns: ['id', 'name', 'email', 'phone', 'active', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'staff',
    columns: ['id', 'name', 'normalized_name', 'email', 'phone', 'department_id', 'created_at', 'updated_at'],
    dateColumns: ['created_at', 'updated_at'],
  },
  {
    name: 'admin_users',
    columns: ['id', 'username', 'password_hash', 'full_name', 'email', 'role', 'status', 'last_login_at', 'created_at'],
    dateColumns: ['last_login_at', 'created_at'],
  },
  {
    name: 'requests',
    columns: [
      'id', 'request_code', 'requester_name', 'department_id', 'request_type_id', 'processing_time_id',
      'description', 'requester_email', 'email_source', 'status', 'admin_notes', 'ip_address',
      'assignee_name', 'assignee_email', 'assignee_phone', 'assigned_at', 'requester_confirmed_at',
      'ai_suggestion', 'ai_alternative_suggestion', 'ai_resolved', 'ai_rating', 'resolved_at',
      'reject_count', 'confirm_reminder_sent_at', 'inprogress_reminder_sent_at', 'csat_rating',
      'confirmed_by', 'escalated_at', 'auto_closed_at', 'priority', 'possible_duplicate_of_id',
      'created_at', 'updated_at',
    ],
    dateColumns: [
      'assigned_at', 'requester_confirmed_at', 'resolved_at', 'confirm_reminder_sent_at',
      'inprogress_reminder_sent_at', 'escalated_at', 'auto_closed_at', 'created_at', 'updated_at',
    ],
  },
  {
    name: 'audit_logs',
    columns: ['id', 'request_id', 'actor_id', 'action', 'field_name', 'old_value', 'new_value', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'request_status_history',
    columns: ['id', 'request_id', 'status', 'note', 'changed_at'],
    dateColumns: ['changed_at'],
  },
  {
    name: 'request_attachments',
    columns: ['id', 'request_id', 'stored_name', 'original_name', 'mime_type', 'size_bytes', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'email_log',
    columns: ['id', 'request_id', 'to_email', 'subject', 'status', 'error', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'faq_entries',
    columns: ['id', 'question', 'answer', 'request_type_id', 'source_request_id', 'active', 'created_at', 'updated_at'],
    dateColumns: ['created_at', 'updated_at'],
  },
  {
    name: 'sla_rules',
    columns: ['id', 'request_type_id', 'priority', 'reminder_days', 'timeout_days', 'updated_at'],
    dateColumns: ['updated_at'],
  },
  {
    // "date" KHÔNG nằm trong dateColumns — cột này lưu 'MM-DD' hoặc 'YYYY-MM-DD' (không phải
    // datetime thật), giữ nguyên TEXT như đã quyết định khi thiết kế schema.sql.
    name: 'holidays',
    columns: ['id', 'date', 'name', 'recurring', 'created_at'],
    dateColumns: ['created_at'],
  },
  {
    name: 'faq_candidates',
    columns: ['id', 'request_ids', 'suggested_question', 'suggested_answer', 'status', 'reviewed_by', 'reviewed_at', 'created_at'],
    dateColumns: ['reviewed_at', 'created_at'],
  },
  {
    // Không có cột "id"/SERIAL — khoá chính là year_month (TEXT).
    name: 'monthly_reports',
    columns: ['year_month', 'sent_at'],
    dateColumns: ['sent_at'],
    hasSerialId: false,
  },
];

// SQLite lưu datetime('now') dưới dạng UTC (mặc định của SQLite, KHÔNG phải giờ địa phương),
// text kiểu "YYYY-MM-DD HH:MM:SS" không có ký hiệu múi giờ — ghép "Z" để parse đúng là UTC,
// tương ứng với cách now() của Postgres cũng lưu UTC nội bộ.
function toUtcDate(value) {
  if (value === null || value === undefined) return null;
  const d = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  console.log(`Đọc SQLite từ: ${sqliteDbPath}`);
  const sqlite = new Database(sqliteDbPath, { readonly: true, fileMustExist: true });

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    // An toàn: từ chối chạy nếu đích đã có dữ liệu — tránh chèn trùng nếu lỡ chạy 2 lần.
    for (const table of TABLES) {
      const { rows } = await client.query(`SELECT COUNT(*) AS c FROM ${table.name}`);
      if (Number(rows[0].c) > 0) {
        console.error(
          `Bảng "${table.name}" ở Postgres đích đã có ${rows[0].c} dòng — dừng lại để tránh chèn ` +
            `trùng. Chỉ chạy script này vào Postgres HOÀN TOÀN TRỐNG (mới migrate() xong, chưa seed dữ ` +
            `liệu thật nào).`
        );
        process.exit(1);
      }
    }

    await client.query('BEGIN');

    for (const table of TABLES) {
      const sqliteRows = sqlite.prepare(`SELECT * FROM ${table.name} ORDER BY ${table.hasSerialId === false ? table.columns[0] : 'id'}`).all();
      let inserted = 0;

      for (const row of sqliteRows) {
        const values = table.columns.map((col) => {
          const raw = row[col];
          return table.dateColumns.includes(col) ? toUtcDate(raw) : raw;
        });
        const placeholders = table.columns.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        inserted += 1;
      }

      // Đặt lại sequence để lần INSERT tiếp theo (không chỉ định id, dùng SERIAL mặc định) tiếp
      // tục từ đúng số lớn nhất vừa chèn, không bị trùng id với dữ liệu vừa di chuyển.
      if (table.hasSerialId !== false && sqliteRows.length > 0) {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${table.name}', 'id'), (SELECT MAX(id) FROM ${table.name}))`
        );
      }

      console.log(`  ${table.name}: đã chèn ${inserted} dòng`);
    }

    // Kiểm tra đối chiếu đếm dòng + toàn vẹn khoá ngoại cơ bản trước khi commit thật.
    let allOk = true;
    for (const table of TABLES) {
      const sqliteCount = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table.name}`).get().c;
      const { rows } = await client.query(`SELECT COUNT(*) AS c FROM ${table.name}`);
      const pgCount = Number(rows[0].c);
      if (sqliteCount !== pgCount) {
        console.error(`  LỖI đối chiếu: ${table.name} — SQLite có ${sqliteCount} dòng, Postgres có ${pgCount} dòng.`);
        allOk = false;
      }
    }
    const { rows: orphanRows } = await client.query(
      `SELECT COUNT(*) AS c FROM requests WHERE department_id IS NOT NULL AND department_id NOT IN (SELECT id FROM departments)`
    );
    if (Number(orphanRows[0].c) > 0) {
      console.error(`  LỖI toàn vẹn: có ${orphanRows[0].c} request trỏ tới department_id không tồn tại.`);
      allOk = false;
    }

    if (!allOk) {
      console.error('Phát hiện lỗi đối chiếu — ROLLBACK toàn bộ, không commit gì cả.');
      await client.query('ROLLBACK');
      process.exit(1);
    }

    await client.query('COMMIT');
    console.log('\nHoàn tất — đã di chuyển toàn bộ dữ liệu sang Postgres, đối chiếu khớp.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi trong lúc di chuyển — đã ROLLBACK, không có gì được ghi:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

main();
