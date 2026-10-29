-- Chạy trên Vercel (serverless) không có ổ đĩa lâu dài như server/data/uploads/ trên PC cũ →
-- nội dung ảnh đính kèm lưu thẳng vào Postgres. Cột để NULL được cho các dòng cũ (nếu có) mà
-- file vẫn nằm trên ổ đĩa máy cũ.
ALTER TABLE request_attachments ADD COLUMN IF NOT EXISTS data BYTEA;
