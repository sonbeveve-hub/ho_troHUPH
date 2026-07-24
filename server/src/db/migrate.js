import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chuyển "priority" (enum cố định gap/binh_thuong/khong_gap) sang processing_time_id
// (FK tới bảng processing_times do admin tự cấu hình). SQLite không hỗ trợ ALTER COLUMN/
// DROP CHECK CONSTRAINT trực tiếp nên phải dựng lại bảng requests, giữ nguyên id để các
// bảng con (request_status_history, request_attachments, email_log) không bị đứt tham chiếu.
function migratePriorityToProcessingTime() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  const hasProcessingTimeId = columns.some((c) => c.name === 'processing_time_id');
  const hasOldPriority = columns.some((c) => c.name === 'priority');

  if (hasProcessingTimeId || !hasOldPriority) return; // đã migrate rồi, hoặc DB mới tinh

  const wasForeignKeysOn = db.pragma('foreign_keys', { simple: true }) === 1;
  db.pragma('foreign_keys = OFF');

  db.transaction(() => {
    db.exec(`
      CREATE TABLE requests_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_code TEXT NOT NULL UNIQUE,
        requester_name TEXT NOT NULL,
        department_id INTEGER REFERENCES departments(id),
        request_type_id INTEGER REFERENCES request_types(id),
        processing_time_id INTEGER REFERENCES processing_times(id),
        description TEXT NOT NULL,
        requester_email TEXT NOT NULL,
        email_source TEXT NOT NULL CHECK (email_source IN ('auto','picked','manual')),
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done','rejected')),
        admin_notes TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`
      INSERT INTO requests_new
        (id, request_code, requester_name, department_id, request_type_id, processing_time_id,
         description, requester_email, email_source, status, admin_notes, ip_address, created_at, updated_at)
      SELECT
        id, request_code, requester_name, department_id, request_type_id, NULL,
        description, requester_email, email_source, status, admin_notes, ip_address, created_at, updated_at
      FROM requests;
    `);

    db.exec('DROP TABLE requests;');
    db.exec('ALTER TABLE requests_new RENAME TO requests;');

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
      CREATE INDEX IF NOT EXISTS idx_requests_department ON requests(department_id);
      CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type_id);
      CREATE INDEX IF NOT EXISTS idx_requests_processing_time ON requests(processing_time_id);
      CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
    `);
  })();

  if (wasForeignKeysOn) db.pragma('foreign_keys = ON');
}

// Thêm cột phân công xử lý (assignee_*) cho DB cũ chưa có — ADD COLUMN đơn giản
// vì các cột này không nằm trong CHECK constraint nào.
function migrateAddAssigneeColumns() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  const hasAssigneeName = columns.some((c) => c.name === 'assignee_name');
  if (hasAssigneeName) return;

  db.exec(`
    ALTER TABLE requests ADD COLUMN assignee_name TEXT;
    ALTER TABLE requests ADD COLUMN assignee_email TEXT;
    ALTER TABLE requests ADD COLUMN assignee_phone TEXT;
    ALTER TABLE requests ADD COLUMN assigned_at TEXT;
  `);
}

export function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  migratePriorityToProcessingTime();
  migrateAddAssigneeColumns();
  // Idempotent — bảo đảm index này luôn tồn tại dù đi qua nhánh nào ở trên.
  db.exec('CREATE INDEX IF NOT EXISTS idx_requests_processing_time ON requests(processing_time_id);');
}
