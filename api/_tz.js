// Phải được import ĐẦU TIÊN trong api/index.js (import ESM chạy theo thứ tự khai báo) — trước khi
// bất kỳ module nào tạo Date. Vercel chạy ở UTC còn PC cũ chạy giờ Việt Nam; mọi chỗ tính ngày
// làm việc, mùng 2 gửi báo cáo, định dạng ngày trong email... đều dựa vào giờ địa phương của Node.
process.env.TZ = 'Asia/Ho_Chi_Minh';
