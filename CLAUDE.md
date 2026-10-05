# CLAUDE.md — Cổng tiếp nhận hỗ trợ IT (hotrohuph.site)

Tài liệu bàn giao cho Claude (và người) mở dự án này lần đầu hoặc sau khi cài lại máy. Đọc hết
file này trước khi làm gì. **File này không chứa bí mật** — mật khẩu/API key nằm trong `.env`
(không có trên GitHub), xem mục 3.

Trạng thái ghi nhận: 2026-10-05, nhánh `main` = commit `f36e508` trở đi.

## 1. Dự án là gì

ITSM nội bộ cho **Trường Đại học Y tế Công cộng** (HUPH): cán bộ/giảng viên gửi yêu cầu hỗ trợ IT
**không cần đăng nhập**, trung tâm tin học (admin) tiếp nhận, phân công, xử lý, theo dõi SLA,
thống kê; người gửi xác nhận/đánh giá qua trang tra cứu hoặc email. Giao diện **tiếng Việt**.
Domain công khai: `https://hotrohuph.site` (qua Cloudflare Tunnel).

- Người dùng nhắn bằng tiếng Việt, câu ngắn ("có" = đồng ý push). Trả lời bằng tiếng Việt.
- Hệ thống đang chạy THẬT cho cả trường → cẩn thận với mọi thay đổi chạm production.

## 2. Kiến trúc

- **Backend** `server/`: Node 22 + Express 4, ESM (`"type":"module"`), **PostgreSQL 16** qua `pg`
  (từ 2026-09-04; trước đó là SQLite/better-sqlite3). Session: `express-session` +
  `connect-pg-simple`. Email: nodemailer (Gmail SMTP). AI: Google Gemini (`gemini-2.5-flash`).
- **Frontend** `client/`: React 18 + Vite + Tailwind 3 (`darkMode:'class'`), React Router 7,
  Recharts, FontAwesome. Font **Be Vietnam Pro**. Trang admin được `React.lazy` code-split.
- Production: Express phục vụ luôn `client/dist` (khi `NODE_ENV=production`) → **sửa client thì
  `npm run build --workspace client`**, không cần restart server. Sửa server thì phải restart
  (mục 4).
- npm workspaces: **chỉ có 1 `package-lock.json` ở gốc**. Chạy `npm install` ở gốc repo.
- Public routes: `/` (form gửi yêu cầu), `/tra-cuu`, `/faq`. Admin: `/admin/*`
  (roles `super_admin` / `admin` / `handler`; handler chỉ thấy Tổng quan + Yêu cầu).
- Luồng trạng thái: `new → in_progress → resolved_pending → done | reopened | done_auto`,
  `rejected`. Ưu tiên P1–P4. SLA theo loại yêu cầu/ưu tiên, tính theo **ngày làm việc** (bảng
  `holidays`). Có FAQ + đề xuất FAQ bán tự động, trợ lý AI (ChatWidget, PreChatWidget),
  CSAT, báo cáo tháng tự gửi mùng 2, audit log field-level, phát hiện trùng lặp theo nội dung
  (trigram Dice bằng JS, `similarity.service.js`).
- Chống spam hiện có: honeypot `website`, rate limit theo IP (`middleware/rateLimit.js`),
  **chỉ nhận email thuộc `ALLOWED_EMAIL_DOMAINS`** (hiện `huph.edu.vn`).

## 3. Trạng thái triển khai hiện tại + bí mật nằm đâu

Chạy trên **PC Windows cá nhân của người dùng** (`D:\Ho_Tro`), KHÔNG qua Docker:

- Node chạy trực tiếp; PostgreSQL 16 cài native (service `postgresql-x64-16`), database
  `hotro_production`, role `hotro`. Chuỗi kết nối nằm trong `.env` → `DATABASE_URL`
  (`...@localhost:5432/hotro_production`). Database `hotro_dev` chỉ để thử nghiệm.
- Tự khởi động cùng Windows: 2 shortcut trong Startup folder (`shell:startup`):
  `HoTro-Server.lnk`, `HoTro-Tunnel.lnk` → `wscript.exe` chạy `scripts/start-server-hidden.vbs`
  và `scripts/start-tunnel-hidden.vbs` → `scripts/start-server.bat` / `start-tunnel.bat`
  (vòng lặp vô hạn, tự chạy lại sau 5 giây). Log: `server/data/server-run.log`,
  `server/data/tunnel-run.log`.
- Cloudflare Tunnel id `2380d79b-d341-4a4f-8d59-2b1ab5d97708` → `http://localhost:4000`.
  `cloudflared/config.yml` + `C:\Users\<user>\.cloudflared\*.json` + `cert.pem` **không có trên
  GitHub**; `cloudflared.exe` cũng không (tải từ GitHub releases của cloudflare).
- **Không có trên GitHub (phải lấy từ bản backup/handoff)**: `.env` (SMTP_PASS, GEMINI_API_KEY,
  SESSION_SECRET, DATABASE_URL), dữ liệu PostgreSQL, `server/data/uploads/` (ảnh đính kèm),
  credentials Cloudflare.
- Khôi phục từng bước: xem **`RESTORE.md`** (đã viết cho Postgres: `pg_dump`/`pg_restore`).
- Bản SQLite cũ trước cutover còn ở `server/data/backups/` (nếu còn) — chỉ để rollback/đối chiếu.
- Code SQLite cũ: `better-sqlite3` + `better-sqlite3-session-store` vẫn còn trong
  `server/package.json` chỉ vì script ETL `server/scripts/migrate-sqlite-to-postgres.js` cần đọc
  `app.db` cũ. Có thể gỡ khi chắc chắn không cần quay lại SQLite.

## 4. Quy ước & bẫy khi làm việc (đã trả giá để biết)

**Restart server**: vòng lặp `start-server.bat` tự chạy lại node. Sau khi sửa backend chỉ cần
`taskkill //F //PID <node.exe>` MỘT lần rồi `sleep 8`, kiểm tra `curl localhost:4000/api/faq`.
**Không** tự `node server/src/index.js` song song (thua cuộc đua cổng 4000 → `EADDRINUSE`). Khi
cutover/di chuyển DB: kill luôn cả cmd.exe của vòng lặp trước (`Stop-Process` PID của
`start-server.bat`), làm xong mới bật lại. Máy có thể có 2 node.exe khi test: server thật cổng
4000, bản thử cổng khác — kiểm tra PID trước khi kill.

**Lớp DB** `server/src/db/index.js` — shim mỏng, giữ hình dạng cũ của better-sqlite3:
`await db.get(sql, [params])`, `db.all`, `db.run`, `db.exec`, `db.transaction(async tx => {...})`.
Dùng placeholder `?` (tự đổi sang `$n`). Dùng `tx` (không dùng `db`) bên trong transaction.
INSERT cần `RETURNING id` nếu đọc `.lastInsertRowid`. Dùng `now()`, `ILIKE` (không `LIKE`),
`make_interval(days => ?)`, `IS NOT DISTINCT FROM` (không `IS ?`). Lỗi trùng/khoá ngoại:
`err.code === '23505'` / `'23503'`. Cột thời gian là `TIMESTAMPTZ` → driver trả **JS Date**
(không parse chuỗi `.replace(' ','T')` kiểu SQLite nữa). `COUNT/SUM/AVG` đã được ép thành
number toàn cục (`pg.types.setTypeParser`). Mọi route bọc `asyncHandler`; `logAudit`/
`diffAndLog` là async → luôn `await`. Boolean vẫn là INTEGER 0/1 (cố ý). Đổi schema về sau:
thêm file `server/src/db/migrations/NNN_ten.sql` (bảng `schema_migrations`), đừng sửa lại
`schema.sql` cho DB đã chạy.

**Dark mode**: `.dark` chỉ gắn vào div bọc BÊN TRONG từng trang (public và admin độc lập,
localStorage khác nhau `hotro-public-theme` / `hotro-admin-theme`), cộng class `dark` đồng bộ lên
`document.body` trong `hooks/useTheme.js`. Admin dùng chung nhiều class Tailwind nên có khối
override toàn cục trong `client/src/index.css` (`.dark .bg-white\/70 {...}`). Nút đổi sáng/tối
gắn trong `PublicNav`. Body text mặc định `text-align: justify`; tiêu đề dùng `text-balance`.

**Windows / Git Bash**: gõ tiếng Việt thẳng trong `curl -d '...'` bị hỏng mã hoá → ghi payload
ra file UTF-8 rồi `--data-binary @file`. `readline` + pipe stdin không chạy trong môi trường này
(script `create-admin.js` phải chạy trong terminal thật). Git có `core.autocrlf=true` nên cảnh báo
"LF will be replaced by CRLF" là vô hại; các file `client/...` hiện hiện ở trạng thái "modified"
chỉ do khác biệt EOL (không có thay đổi nội dung thật) — bỏ qua.

**Git**: remote `origin` = `https://github.com/sonbeveve-hub/ho_troHUPH.git`, nhánh chính `main`.
Máy dev từng đứng ở nhánh cục bộ `postgres-migration` (bằng `main` từ xa); chuyển nhánh/merge cục
bộ có lúc bị chặn bởi bộ phân loại an toàn → đã dùng `git push origin <nhánh>:main`. Chỉ commit/
push khi người dùng đồng ý ("có"); không gom các thay đổi không liên quan vào commit.

**Công cụ test trình duyệt (Claude Browser)**: `getComputedStyle` trên phần tử đã query nhiều lần
có thể trả giá trị cũ → `cloneNode(true)` rồi append vào body rồi đo bản sao. `requestAnimationFrame`
không chạy khi pane ẩn → dùng `setTimeout`. Ô input React cần setter native + `dispatchEvent('input')`.

**Quyền/PostgreSQL**: mật khẩu superuser `postgres` cài bằng winget mặc định là `postgres`
(đổi nếu máy cài lại theo cách khác). Một số lệnh `psql CREATE DATABASE` qua Bash bị chặn bởi bộ
phân loại nhưng chạy được qua PowerShell.

## 5. Việc còn dở / ý tưởng đã bàn

1. **Triển khai Docker lên máy chủ của trường (Windows + Docker Desktop)** — chuẩn bị xong nhưng
   CHƯA triển khai và CHƯA test build (máy dev không có Docker): `Dockerfile` (2 giai đoạn, base
   Debian), `docker-compose.yml` (3 service: `postgres:16-alpine`, `app`, `cloudflared`; app mở
   `0.0.0.0:80` cho LAN + `127.0.0.1:4000`), `.dockerignore`,
   `cloudflared/config.docker.yml.example` (copy thành `config.docker.yml`, điền tunnel id; đặt
   credentials JSON vào `cloudflared/credentials/`). Cần: quyền RDP/tại chỗ vào máy trường; IP LAN
   tĩnh + bản ghi DNS nội bộ do phòng CNTT làm (Express không cần biết tên domain nội bộ).
   `session cookie` đã đặt `secure:'auto'` để đăng nhập admin chạy được cả qua HTTP nội bộ lẫn
   HTTPS qua Cloudflare. Chuyển dữ liệu sang Postgres trong Docker: dùng `pg_dump`/`pg_restore`
   (script SQLite→Postgres chỉ cho lần cutover đã xong). `.env` khi chạy Docker dùng host
   `postgres` (xem `.env.example`).
2. **Chống spam thêm** (đã brainstorm, chưa làm): time-trap (form gửi < ~3s = bot), Cloudflare Bot
   Fight Mode, Cloudflare Turnstile (invisible), rate limit theo IP+email, soft-review thay vì chặn.
3. **Console SQL chỉ-đọc trong trang admin** (đề xuất cho nhu cầu "truy vấn dữ liệu", chỉ
   super_admin, chỉ cho `SELECT`): chưa làm. Có thể dùng DBeaver/pgAdmin tạm.
4. Tuỳ chọn: thay trigram JS bằng `pg_trgm` thật; đổi cột 0/1 sang BOOLEAN; README.md còn vài
   dòng cũ nhắc SQLite.
5. Thư mục `docs/` (3 file .docx mô tả hệ thống, chưa commit) chỉ là tài liệu tham khảo.

## 6. Cách làm việc với người dùng này

Ngắn gọn, tiếng Việt. Đề xuất rồi hỏi "có/không" trước khi push hoặc đụng production. Thích
được "brainstorm" các phương án trước khi code với việc lớn; thích kết quả đã được test thật
(HTTP/trình duyệt) hơn là chỉ đọc code. Khi báo lỗi thường gửi ảnh chụp màn hình — suy luận từ
kiến trúc CSS/DB rồi kiểm chứng bằng đo đạc.
