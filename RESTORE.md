# Khôi phục sau khi cài lại Windows / mất máy

> **Cập nhật 2026-09-04**: hệ thống đã chuyển từ SQLite (`server/data/app.db`) sang PostgreSQL
> (chạy trực tiếp trên máy này, ngoài Docker) — backup/khôi phục database giờ dùng `pg_dump`/
> `psql`, KHÔNG còn là copy 1 file `.db` như trước.

Mã nguồn nằm trên GitHub nên luôn khôi phục được. Phần **không** nằm trên GitHub (và bắt buộc
phải có bản backup riêng trước khi cài lại Windows) là: `.env`, **dữ liệu PostgreSQL** (xem cách
sao lưu bên dưới), ảnh đính kèm `server/data/uploads/`, và file chứng thực Cloudflare Tunnel
(`C:\Users\<user>\.cloudflared\*.json` + `cert.pem`).

**Trước khi cài lại Windows**: tạo 1 file zip chứa `.env` + `uploads/` + bản `pg_dump` của
database + credentials Cloudflare (nhờ Claude làm việc này bất cứ lúc nào), rồi copy ra
USB/Google Drive/email cho chính mình — đừng để zip chỉ nằm trên máy sắp bị xoá.

## Sao lưu PostgreSQL

```bash
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U hotro -h localhost -d hotro_production -F c -f app-db-backup.dump
```
(cần `PGPASSWORD` hoặc nhập mật khẩu — lấy đúng giá trị trong `DATABASE_URL` ở file `.env`).

## Các bước khôi phục

1. Cài Node.js LTS (nodejs.org), Git (git-scm.com), và PostgreSQL
   ([postgresql.org](https://www.postgresql.org/download/windows/) hoặc `winget install PostgreSQL.PostgreSQL.16`).
2. Clone code:
   ```bash
   cd D:\
   git clone https://github.com/sonbeveve-hub/ho_troHUPH.git Ho_Tro
   cd Ho_Tro
   npm install
   ```
3. Giải nén file zip backup, khôi phục vào đúng vị trí:
   - `.env` → `D:\Ho_Tro\.env`
   - `uploads/` → `D:\Ho_Tro\server\data\uploads\`
   - `cloudflared/config.yml` → `D:\Ho_Tro\cloudflared\config.yml`
   - `cloudflared-credentials/*` → `C:\Users\<user>\.cloudflared\`
4. Tạo lại role + database PostgreSQL, khớp đúng thông tin trong `DATABASE_URL` của `.env`:
   ```bash
   psql -U postgres -c "CREATE ROLE hotro LOGIN PASSWORD '<mật khẩu trong .env>';"
   psql -U postgres -c "CREATE DATABASE hotro_production OWNER hotro;"
   ```
5. Khôi phục dữ liệu từ bản `pg_dump`:
   ```bash
   "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" -U hotro -h localhost -d hotro_production app-db-backup.dump
   ```
   (chạy `node server/src/index.js` một lần trước đó nếu database còn trống — `migrate()` sẽ tự
   tạo schema; sau đó mới `pg_restore`).
6. Build client: `npm run build --workspace client`
7. Tải `cloudflared.exe` (Windows amd64) từ
   [github.com/cloudflare/cloudflared/releases/latest](https://github.com/cloudflare/cloudflared/releases/latest),
   đặt vào `D:\Ho_Tro\cloudflared\cloudflared.exe` (file .exe không nằm trong GitHub, bị
   `.gitignore` loại trừ có chủ đích).
8. Chạy thử thủ công trước khi tự động hoá:
   ```bash
   node server/src/index.js
   # tab khác:
   cd cloudflared && .\cloudflared.exe tunnel --config config.yml run
   ```
   Kiểm tra `https://hotrohuph.site` truy cập được, rồi Ctrl+C tắt cả 2.
9. Thiết lập tự khởi động cùng Windows (Task Scheduler bị chặn trên máy này, dùng Startup
   folder — nhấn Windows+R, gõ `shell:startup`): tạo 2 shortcut trỏ tới
   `C:\WINDOWS\system32\wscript.exe` với tham số
   `"D:\Ho_Tro\scripts\start-server-hidden.vbs"` và
   `"D:\Ho_Tro\scripts\start-tunnel-hidden.vbs"` — hoặc nhờ Claude tạo lại bằng PowerShell.
10. Khởi động lại máy hoặc chạy thử 2 shortcut, xác nhận `https://hotrohuph.site` truy cập
    được từ bên ngoài.

Nếu không khôi phục dữ liệu PostgreSQL (bước 5), hệ thống sẽ tự tạo database mới hoàn toàn trống
ở lần chạy đầu tiên (mất hết lịch sử yêu cầu cũ) — luôn khôi phục trước khi cho người dùng thật
truy cập lại.

## Nếu đang triển khai bằng Docker (máy trường)

Xem `docker-compose.yml` — PostgreSQL chạy trong container riêng (`postgres`), dữ liệu nằm ở
Docker volume `postgres_data` chứ không phải thư mục `server/data/`. Sao lưu bằng
`docker compose exec postgres pg_dump -U hotro hotro -F c -f /tmp/backup.dump` rồi copy file đó
ra khỏi container (`docker compose cp postgres:/tmp/backup.dump ./backup.dump`).
