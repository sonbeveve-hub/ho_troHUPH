# Khôi phục sau khi cài lại Windows / mất máy

Mã nguồn nằm trên GitHub nên luôn khôi phục được. Phần **không** nằm trên GitHub (và bắt buộc
phải có bản backup riêng trước khi cài lại Windows) là: `.env`, database `server/data/app.db`,
ảnh đính kèm `server/data/uploads/`, và file chứng thực Cloudflare Tunnel
(`C:\Users\<user>\.cloudflared\*.json` + `cert.pem`).

**Trước khi cài lại Windows**: tạo 1 file zip chứa đủ 4 mục trên (nhờ Claude làm việc này bất cứ
lúc nào), rồi copy ra USB/Google Drive/email cho chính mình — đừng để zip chỉ nằm trên máy sắp bị
xoá.

## Các bước khôi phục

1. Cài Node.js LTS (nodejs.org) và Git (git-scm.com).
2. Clone code:
   ```bash
   cd D:\
   git clone https://github.com/sonbeveve-hub/ho_troHUPH.git Ho_Tro
   cd Ho_Tro
   npm install
   ```
3. Giải nén file zip backup, khôi phục vào đúng vị trí:
   - `.env` → `D:\Ho_Tro\.env`
   - `app.db` → `D:\Ho_Tro\server\data\app.db`
   - `uploads/` → `D:\Ho_Tro\server\data\uploads\`
   - `cloudflared/config.yml` → `D:\Ho_Tro\cloudflared\config.yml`
   - `cloudflared-credentials/*` → `C:\Users\<user>\.cloudflared\`
4. Build client: `npm run build --workspace client`
5. Tải `cloudflared.exe` (Windows amd64) từ
   [github.com/cloudflare/cloudflared/releases/latest](https://github.com/cloudflare/cloudflared/releases/latest),
   đặt vào `D:\Ho_Tro\cloudflared\cloudflared.exe` (file .exe không nằm trong GitHub, bị
   `.gitignore` loại trừ có chủ đích).
6. Chạy thử thủ công trước khi tự động hoá:
   ```bash
   node server/src/index.js
   # tab khác:
   cd cloudflared && .\cloudflared.exe tunnel --config config.yml run
   ```
   Kiểm tra `https://hotrohuph.site` truy cập được, rồi Ctrl+C tắt cả 2.
7. Thiết lập tự khởi động cùng Windows (Task Scheduler bị chặn trên máy này, dùng Startup
   folder — nhấn Windows+R, gõ `shell:startup`): tạo 2 shortcut trỏ tới
   `C:\WINDOWS\system32\wscript.exe` với tham số
   `"D:\Ho_Tro\scripts\start-server-hidden.vbs"` và
   `"D:\Ho_Tro\scripts\start-tunnel-hidden.vbs"` — hoặc nhờ Claude tạo lại bằng PowerShell.
8. Khởi động lại máy hoặc chạy thử 2 shortcut, xác nhận `https://hotrohuph.site` truy cập
   được từ bên ngoài.

Nếu không khôi phục `app.db`, hệ thống sẽ tự tạo database mới hoàn toàn trống ở lần chạy đầu
tiên (mất hết lịch sử yêu cầu cũ) — luôn khôi phục bước 3 trước khi chạy server lần đầu.
