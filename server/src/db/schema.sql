-- Schema PostgreSQL — thay cho schema SQLite cũ (xem lịch sử git nếu cần đối chiếu). Giữ nguyên
-- tên bảng/cột/CHECK constraint để tối thiểu hoá thay đổi ở tầng code phía trên. Khác biệt chính
-- so với bản SQLite:
--   - AUTOINCREMENT -> SERIAL
--   - datetime('now') -> now(), cột thời gian đổi từ TEXT sang TIMESTAMPTZ (driver pg trả về
--     JS Date thay vì chuỗi text)
--   - Các cột boolean-kiểu (active, recurring...) CỐ Ý giữ nguyên INTEGER 0/1, KHÔNG đổi sang
--     BOOLEAN thật — xem ghi chú trong kế hoạch migration, tránh phải rà lại toàn bộ so sánh
--     "= 1"/"= 0" trong code cho lợi ích thuần tuý về kiểu dữ liệu.
--   - Thứ tự bảng đổi lại theo đúng phụ thuộc khoá ngoại (Postgres, khác SQLite, bắt buộc bảng
--     được REFERENCES phải tồn tại trước — vd audit_logs tham chiếu requests nên phải tạo requests
--     trước audit_logs, khác thứ tự cũ).
--   - Các index trước đây phải tạo riêng trong migrate.js (vì SQLite không ALTER thêm cột rồi
--     tạo UNIQUE INDEX cùng lúc an toàn khi nâng cấp từ bản cũ) nay gộp thẳng vào đây vì đây là
--     database Postgres hoàn toàn mới, không có "bản cũ" nào cần nâng cấp dần.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  default_priority TEXT NOT NULL DEFAULT 'P3' CHECK (default_priority IN ('P1','P2','P3','P4')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processing_times (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_normalized_name ON staff(normalized_name);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','handler')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email) WHERE email IS NOT NULL;

-- "requests" phải tạo TRƯỚC audit_logs/request_status_history/... vì các bảng đó REFERENCES nó
-- (Postgres, khác SQLite, không cho phép tham chiếu tới bảng chưa tồn tại).
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
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
  assigned_at TIMESTAMPTZ,
  requester_confirmed_at TIMESTAMPTZ,
  ai_suggestion TEXT,
  ai_alternative_suggestion TEXT,
  ai_resolved INTEGER,
  ai_rating INTEGER,
  resolved_at TIMESTAMPTZ,
  reject_count INTEGER NOT NULL DEFAULT 0,
  confirm_reminder_sent_at TIMESTAMPTZ,
  inprogress_reminder_sent_at TIMESTAMPTZ,
  csat_rating INTEGER,
  confirmed_by TEXT,
  escalated_at TIMESTAMPTZ,
  auto_closed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1','P2','P3','P4')),
  possible_duplicate_of_id INTEGER REFERENCES requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_department ON requests(department_id);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(request_type_id);
CREATE INDEX IF NOT EXISTS idx_requests_processing_time ON requests(processing_time_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority);

-- Audit log field-level, append-only — không có route sửa/xoá cho bảng này.
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS request_status_history (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_status_history_request ON request_status_history(request_id);

CREATE TABLE IF NOT EXISTS request_attachments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachments_request ON request_attachments(request_id);

CREATE TABLE IF NOT EXISTS email_log (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','failed','skipped_no_config')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_request ON email_log(request_id);

-- Cơ sở tri thức (FAQ) — đúc kết từ các yêu cầu đã xử lý phổ biến, hiển thị công khai và
-- dùng làm ngữ cảnh bổ sung cho Trợ lý AI khi gợi ý khắc phục.
CREATE TABLE IF NOT EXISTS faq_entries (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  request_type_id INTEGER REFERENCES request_types(id) ON DELETE SET NULL,
  source_request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_faq_request_type ON faq_entries(request_type_id);
CREATE INDEX IF NOT EXISTS idx_faq_active ON faq_entries(active);

-- Giai đoạn 2 (đặc tả phát triển tiếp theo): cấu hình SLA (nhắc nhở/tự đóng) theo loại yêu
-- cầu và/hoặc mức ưu tiên, thay cho hằng số CONFIRM_REMINDER_DAYS/CONFIRM_TIMEOUT_DAYS áp
-- dụng chung toàn hệ thống. Xem sla.service.js để biết thứ tự tra cứu rule.
CREATE TABLE IF NOT EXISTS sla_rules (
  id SERIAL PRIMARY KEY,
  request_type_id INTEGER REFERENCES request_types(id) ON DELETE CASCADE,
  priority TEXT CHECK (priority IN ('P1','P2','P3','P4')),
  reminder_days INTEGER NOT NULL,
  timeout_days INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_type_id, priority)
);
CREATE INDEX IF NOT EXISTS idx_sla_rules_type ON sla_rules(request_type_id);

-- Ngày nghỉ dùng để tính thời hạn theo ngày làm việc (workingDays.service.js). date lưu
-- 'MM-DD' khi recurring=1 (lặp lại hàng năm theo dương lịch), 'YYYY-MM-DD' khi recurring=0
-- (ngày âm lịch như Tết Nguyên đán — phải nhập tay mỗi năm). Giữ nguyên kiểu TEXT (không phải
-- DATE thật) vì định dạng lẫn lộn 2 kiểu — không đổi hành vi so với bản SQLite.
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  recurring INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Giai đoạn 3: đề xuất FAQ bán tự động — nhóm các yêu cầu đã Hoàn thành có giải pháp tương
-- tự nhau, chờ quản lý duyệt trước khi tạo thành mục faq_entries chính thức. request_ids giữ
-- nguyên kiểu TEXT (JSON-as-text, JS tự JSON.stringify/parse) — không đổi sang JSONB vì không
-- có nhu cầu truy vấn theo nội dung, tránh thay đổi không cần thiết.
CREATE TABLE IF NOT EXISTS faq_candidates (
  id SERIAL PRIMARY KEY,
  request_ids TEXT NOT NULL,
  suggested_question TEXT NOT NULL,
  suggested_answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_faq_candidates_status ON faq_candidates(status);

-- Đánh dấu tháng nào đã gửi báo cáo tổng quan định kỳ (mùng 2 hằng tháng) — chặn gửi trùng
-- nếu tiến trình quét chạy nhiều lần trong cùng khoảng ngày mùng 2-3.
CREATE TABLE IF NOT EXISTS monthly_reports (
  year_month TEXT PRIMARY KEY,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
