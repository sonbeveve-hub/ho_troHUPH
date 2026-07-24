CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  email TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_staff_normalized_name ON staff(normalized_name);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_code TEXT NOT NULL UNIQUE,
  requester_name TEXT NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  request_type_id INTEGER REFERENCES request_types(id),
  priority TEXT NOT NULL CHECK (priority IN ('gap','binh_thuong','khong_gap')),
  description TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  email_source TEXT NOT NULL CHECK (email_source IN ('auto','picked','manual')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done','rejected')),
  admin_notes TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_department ON requests(department_id);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

CREATE TABLE IF NOT EXISTS request_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_status_history_request ON request_status_history(request_id);

CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','failed','skipped_no_config')),
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_log_request ON email_log(request_id);
