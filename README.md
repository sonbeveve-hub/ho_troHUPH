# Hệ thống Yêu cầu Hỗ trợ

Web app nội bộ: người dùng gửi yêu cầu hỗ trợ không cần đăng nhập, admin theo dõi
tiến độ, cập nhật trạng thái và gửi email thông báo, xem thống kê.

- **Backend**: Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend**: React + Vite + Tailwind CSS
- **Hosting**: tự host trên máy cá nhân (chạy 24/7), lộ ra internet qua Cloudflare Tunnel (miễn phí)

## 1. Cài đặt lần đầu

```bash
npm install
cp .env.example .env
```

Mở `.env` và chỉnh `SESSION_SECRET` thành một chuỗi ngẫu nhiên dài. Phần `SMTP_*`
có thể để trống — hệ thống vẫn chạy bình thường, chỉ là chưa gửi được email tiến
độ cho tới khi bạn điền (xem mục 5).

Tạo tài khoản admin (chạy trong một cửa sổ terminal thật, không qua script/pipe):

```bash
npm run create-admin
```

## 2. Chạy ở chế độ phát triển

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Trang gửi yêu cầu: `/`
- Trang quản trị: `/admin/login`

## 3. Import dữ liệu ban đầu bằng Excel

Vào **Quản trị → Nhân sự / Đơn vị / Loại yêu cầu → Import Excel**.

**File danh sách nhân sự** cần các cột (không phân biệt hoa/thường):

| Họ tên | Email | Khoa/phòng/đơn vị |
|---|---|---|
| Nguyễn Văn A | a@donvi.gov.vn | Phòng Công nghệ thông tin |

Đơn vị chưa tồn tại sẽ được tự động tạo mới. Import lại nhiều lần sẽ **cập nhật**
(theo email, hoặc theo tên+đơn vị nếu không có email) chứ không tạo trùng.

**File danh sách đơn vị / loại yêu cầu** chỉ cần cột `Tên` (loại yêu cầu có thêm
cột `Mô tả` tuỳ chọn).

## 4. Build & chạy production

```bash
npm run build
npm start
```

Server sẽ phục vụ cả API (`/api/*`) và giao diện đã build từ một cổng duy nhất
(mặc định `4000`, đổi trong `.env`).

### Chạy nền liên tục trên Windows

Cài `pm2`:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

`pm2 start`/`pm2 save` giữ tiến trình chạy, nhưng **không tự khởi động lại sau khi
Windows reboot** trừ khi bạn cài thêm 1 trong 2 cách sau:

- **Cách 1 (khuyên dùng): [nssm](https://nssm.cc/)** — chạy app như một Windows Service thật:
  ```bash
  nssm install HoTroApp "C:\Program Files\nodejs\node.exe" "D:\Ho_Tro\server\src\index.js"
  ```
- **Cách 2: Task Scheduler** — tạo task chạy `npm start` (trong thư mục `D:\Ho_Tro`)
  khi đăng nhập Windows, không cần cài thêm phần mềm.

### Lộ ra internet bằng Cloudflare Tunnel

1. Cài `cloudflared`: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Test nhanh (không cần domain, có ngay 1 link tạm):
   ```bash
   cloudflared tunnel --url http://localhost:4000
   ```
3. Nếu có domain riêng, tạo tunnel cố định:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create ho-tro-app
   cloudflared tunnel route dns ho-tro-app support.tenmien-cua-ban.com
   ```
   Copy `cloudflared/config.yml.example` thành `cloudflared/config.yml`, điền
   `tunnel id` và `credentials-file` vừa tạo, rồi chạy:
   ```bash
   cloudflared tunnel --config cloudflared/config.yml run
   cloudflared service install   # để tự chạy nền cùng Windows
   ```

**Lưu ý bảo mật**: chỉ chạy `npm start` (production) khi expose ra ngoài qua tunnel.
**Không** chạy `npm run dev` (Vite dev server) trên máy đang mở tunnel công khai —
Vite dev server không được thiết kế để chịu truy cập từ internet không tin cậy.

## 5. Cấu hình gửi email tiến độ (SMTP)

Điền vào `.env` rồi khởi động lại server. Ví dụ với Gmail (cần bật xác minh 2 bước
và tạo [App Password](https://myaccount.google.com/apppasswords)):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ten-ban@gmail.com
SMTP_PASS=app-password-16-ky-tu
SMTP_FROM="Hỗ trợ <ten-ban@gmail.com>"
```

Hostinger email hoặc Outlook dùng đúng cấu trúc trên, chỉ đổi `SMTP_HOST`/`SMTP_PORT`
(xem gợi ý trong `.env.example`). Nếu để trống, admin vẫn cập nhật trạng thái được
bình thường — hệ thống chỉ ghi log "chưa cấu hình" thay vì gửi email.

## 6. Sao lưu dữ liệu

Toàn bộ dữ liệu (yêu cầu, nhân sự, tài khoản admin, phiên đăng nhập) nằm trong
1 file: `server/data/app.db`. Sao lưu định kỳ bằng cách copy file này khi server
đang tắt (hoặc dùng `VACUUM INTO` nếu cần copy khi đang chạy).

## 7. Ghi chú bảo mật đã biết

- Thư viện `xlsx` (SheetJS) có 2 lỗ hổng chưa có bản vá chính thức trên npm. Rủi
  ro thấp vì chức năng import chỉ dành cho admin đã đăng nhập — chỉ import file
  Excel từ nguồn bạn tin tưởng.
- Cảnh báo `esbuild`/Vite chỉ ảnh hưởng khi chạy `npm run dev` — không dùng khi
  đã build production (xem lưu ý ở mục 4).

## Cấu trúc thư mục

```
server/   Express API + SQLite (server/src, server/scripts/create-admin.js)
client/   React + Vite + Tailwind SPA
```
