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

// Thêm sort_order cho các bảng danh mục để admin có thể tự sắp xếp thứ tự hiển thị.
// Backfill theo đúng thứ tự đang hiển thị hiện tại (tên/số ngày) để không đổi thứ tự
// nhìn thấy của admin ngay sau khi migrate.
function migrateAddSortOrder() {
  const tables = [
    { name: 'departments', orderBy: 'name' },
    { name: 'request_types', orderBy: 'name' },
    { name: 'processing_times', orderBy: 'CAST(name AS INTEGER), name' },
  ];

  for (const { name: table, orderBy } of tables) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (columns.some((c) => c.name === 'sort_order')) continue;

    db.exec(`ALTER TABLE ${table} ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`);

    const rows = db.prepare(`SELECT id FROM ${table} ORDER BY ${orderBy}`).all();
    const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
    db.transaction(() => {
      rows.forEach((row, index) => update.run(index + 1, row.id));
    })();
  }
}

// Thêm cột requester_confirmed_at cho tính năng trang tra cứu công khai
// (người gửi tự xác nhận đã được hỗ trợ).
function migrateAddRequesterConfirmedAt() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  if (columns.some((c) => c.name === 'requester_confirmed_at')) return;
  db.exec('ALTER TABLE requests ADD COLUMN requester_confirmed_at TEXT;');
}

// Thêm các cột phục vụ tính năng AI gợi ý khắc phục sự cố (chatbox sau khi gửi yêu cầu).
function migrateAddAiColumns() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  if (columns.some((c) => c.name === 'ai_suggestion')) return;

  db.exec(`
    ALTER TABLE requests ADD COLUMN ai_suggestion TEXT;
    ALTER TABLE requests ADD COLUMN ai_alternative_suggestion TEXT;
    ALTER TABLE requests ADD COLUMN ai_resolved INTEGER;
    ALTER TABLE requests ADD COLUMN ai_rating INTEGER;
  `);
}

// Mở rộng CHECK(status) để thêm resolved_pending/reopened/done_auto (giai đoạn xác nhận
// hoàn thành), và thêm các cột phục vụ luồng đó (resolved_at, reject_count, nhắc nhở,
// CSAT, xác nhận thay, escalate, tự động đóng). SQLite không ALTER được CHECK constraint
// nên phải dựng lại bảng như migratePriorityToProcessingTime ở trên — giữ nguyên id.
function migrateConfirmationWorkflow() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  if (columns.some((c) => c.name === 'reject_count')) return; // đã migrate rồi

  const existingNames = columns.map((c) => c.name);
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
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved_pending','reopened','done','done_auto','rejected')),
        admin_notes TEXT,
        ip_address TEXT,
        assignee_name TEXT,
        assignee_email TEXT,
        assignee_phone TEXT,
        assigned_at TEXT,
        requester_confirmed_at TEXT,
        ai_suggestion TEXT,
        ai_alternative_suggestion TEXT,
        ai_resolved INTEGER,
        ai_rating INTEGER,
        resolved_at TEXT,
        reject_count INTEGER NOT NULL DEFAULT 0,
        confirm_reminder_sent_at TEXT,
        csat_rating INTEGER,
        confirmed_by TEXT,
        escalated_at TEXT,
        auto_closed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const copyCols = existingNames.join(', ');
    db.exec(`
      INSERT INTO requests_new (${copyCols})
      SELECT ${copyCols} FROM requests;
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

// Thêm cột nhắc nhở cho yêu cầu bị "treo" quá lâu ở trạng thái "Đang xử lý" (không đổi
// CHECK constraint nên chỉ cần ALTER TABLE ADD COLUMN đơn giản, không cần dựng lại bảng).
function migrateAddInprogressReminderColumn() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  if (columns.some((c) => c.name === 'inprogress_reminder_sent_at')) return;
  db.exec('ALTER TABLE requests ADD COLUMN inprogress_reminder_sent_at TEXT;');
}

export function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  migratePriorityToProcessingTime();
  migrateAddAssigneeColumns();
  migrateAddSortOrder();
  migrateAddRequesterConfirmedAt();
  migrateAddAiColumns();
  migrateConfirmationWorkflow();
  migrateAddInprogressReminderColumn();
  // Idempotent — bảo đảm index này luôn tồn tại dù đi qua nhánh nào ở trên.
  db.exec('CREATE INDEX IF NOT EXISTS idx_requests_processing_time ON requests(processing_time_id);');
}
