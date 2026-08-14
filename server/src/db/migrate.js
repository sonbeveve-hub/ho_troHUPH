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

// Thêm cột đánh dấu "có thể trùng lặp" (FK tự tham chiếu requests.id) — không nằm trong
// CHECK constraint nào nên chỉ cần ADD COLUMN đơn giản.
function migrateAddDuplicateColumn() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  if (columns.some((c) => c.name === 'possible_duplicate_of_id')) return;
  db.exec('ALTER TABLE requests ADD COLUMN possible_duplicate_of_id INTEGER REFERENCES requests(id);');
}

// Giai đoạn 1 (đặc tả phát triển tiếp theo), Phần 3: thay bảng danh mục "priorities" (admin
// tự đặt tên/thứ tự, gán tay từng ticket — mới thêm cùng ngày, chưa có dữ liệu thật) bằng
// enum cố định P1–P4 trên chính bảng requests, tự động gán theo request_types.default_priority
// lúc tạo yêu cầu. SQLite hỗ trợ ADD COLUMN kèm CHECK và DROP COLUMN trực tiếp (đã verify
// bundled SQLite 3.49.2) nên không cần dựng lại bảng requests như các lần đổi CHECK trước đây.
function migratePriorityEnum() {
  const columns = db.prepare('PRAGMA table_info(requests)').all();
  const hasNewPriority = columns.some((c) => c.name === 'priority');
  const hasOldPriorityId = columns.some((c) => c.name === 'priority_id');

  if (!hasNewPriority) {
    db.exec(
      "ALTER TABLE requests ADD COLUMN priority TEXT NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1','P2','P3','P4'));"
    );
  }
  if (hasOldPriorityId) {
    // Phải xoá index cũ trỏ vào priority_id trước — SQLite từ chối DROP COLUMN nếu còn
    // index/trigger nào tham chiếu cột đó, và không tự xoá giúp.
    db.exec('DROP INDEX IF EXISTS idx_requests_priority;');
    db.exec('ALTER TABLE requests DROP COLUMN priority_id;');
  }
  db.exec('DROP TABLE IF EXISTS priorities;');

  const typeColumns = db.prepare('PRAGMA table_info(request_types)').all();
  if (!typeColumns.some((c) => c.name === 'default_priority')) {
    db.exec(
      "ALTER TABLE request_types ADD COLUMN default_priority TEXT NOT NULL DEFAULT 'P3' CHECK (default_priority IN ('P1','P2','P3','P4'));"
    );
  }
}

// Giai đoạn 1, Phần 1: tài khoản quản lý cá nhân hoá. Thêm cột role/status/email/... rồi
// promote TOÀN BỘ tài khoản đã tồn tại trước migration lên super_admin — mọi tài khoản có
// từ trước (dưới mô hình 1 mật khẩu dùng chung) mặc nhiên có toàn quyền, nên giữ nguyên
// mức đó thay vì âm thầm hạ xuống 'admin' thường.
function migrateAdminUserRoles() {
  const columns = db.prepare('PRAGMA table_info(admin_users)').all();
  if (columns.some((c) => c.name === 'role')) return; // đã migrate rồi

  const preExistingIds = db.prepare('SELECT id FROM admin_users').all().map((r) => r.id);

  db.exec(`
    ALTER TABLE admin_users ADD COLUMN full_name TEXT;
    ALTER TABLE admin_users ADD COLUMN email TEXT;
    ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin'));
    ALTER TABLE admin_users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled'));
    ALTER TABLE admin_users ADD COLUMN last_login_at TEXT;
  `);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email) WHERE email IS NOT NULL;');

  if (preExistingIds.length) {
    const promote = db.prepare(
      "UPDATE admin_users SET role = 'super_admin', full_name = COALESCE(full_name, 'Quản trị viên') WHERE id = ?"
    );
    db.transaction(() => {
      preExistingIds.forEach((id) => promote.run(id));
    })();
  }
}

// Thêm mức vai trò thứ 3 "handler" (người phụ trách) — chỉ xử lý yêu cầu được phân công,
// không cấu hình danh mục/SLA/ngày nghỉ/nhân sự/FAQ. SQLite không ALTER được CHECK constraint
// trực tiếp nên phải dựng lại bảng như các lần đổi CHECK trước — khác với các lần trước, có
// thêm bước đếm số dòng trước/sau để chắc chắn không rơi mất tài khoản nào trong lúc dựng lại.
function migrateHandlerRole() {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='admin_users'").get();
  if (tableInfo && tableInfo.sql.includes("'handler'")) return; // đã migrate rồi

  const beforeCount = db.prepare('SELECT COUNT(*) c FROM admin_users').get().c;
  const wasForeignKeysOn = db.pragma('foreign_keys', { simple: true }) === 1;
  db.pragma('foreign_keys = OFF');

  db.transaction(() => {
    db.exec(`
      CREATE TABLE admin_users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        full_name TEXT,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','handler')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
        last_login_at TEXT
      );
    `);
    db.exec(`
      INSERT INTO admin_users_new
        (id, username, password_hash, created_at, full_name, email, role, status, last_login_at)
      SELECT id, username, password_hash, created_at, full_name, email, role, status, last_login_at
      FROM admin_users;
    `);

    const afterCount = db.prepare('SELECT COUNT(*) c FROM admin_users_new').get().c;
    if (afterCount !== beforeCount) {
      throw new Error(
        `migrateHandlerRole: số dòng không khớp sau khi copy (trước=${beforeCount}, sau=${afterCount}) — huỷ migration, giữ nguyên bảng cũ.`
      );
    }

    db.exec('DROP TABLE admin_users;');
    db.exec('ALTER TABLE admin_users_new RENAME TO admin_users;');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email) WHERE email IS NOT NULL;');
  })();

  if (wasForeignKeysOn) db.pragma('foreign_keys = ON');
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
  migrateAddDuplicateColumn();
  migratePriorityEnum();
  migrateAdminUserRoles();
  migrateHandlerRole();
  // Idempotent — bảo đảm các index này luôn tồn tại dù đi qua nhánh nào ở trên (cột có thể
  // vừa được ALTER TABLE thêm vào nên không đặt index này trong schema.sql).
  db.exec('CREATE INDEX IF NOT EXISTS idx_requests_processing_time ON requests(processing_time_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority);');
}
