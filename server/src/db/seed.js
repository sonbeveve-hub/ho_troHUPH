import { db } from './index.js';

const defaultDepartments = [
  'Phòng Hành chính',
  'Phòng Kế toán',
  'Phòng Nhân sự',
  'Phòng Công nghệ thông tin',
  'Phòng Đào tạo',
];

const defaultRequestTypes = [
  ['Sự cố kỹ thuật / CNTT', 'Máy tính, mạng, phần mềm, thiết bị gặp lỗi'],
  ['Cấp phát tài khoản / quyền truy cập', 'Tạo mới hoặc cấp quyền tài khoản hệ thống'],
  ['Yêu cầu văn phòng phẩm / cơ sở vật chất', 'Bàn ghế, thiết bị, vật tư văn phòng'],
  ['Hỗ trợ hành chính / nhân sự', 'Giấy tờ, xác nhận, thủ tục nội bộ'],
  ['Khác', 'Yêu cầu không thuộc các nhóm trên'],
];

const defaultProcessingTimes = ['1', '3', '5', '7', '15'];

export function seed() {
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)');
  const insertType = db.prepare(
    'INSERT OR IGNORE INTO request_types (name, description) VALUES (?, ?)'
  );
  const insertProcessingTime = db.prepare(
    'INSERT OR IGNORE INTO processing_times (name) VALUES (?)'
  );

  const seedAll = db.transaction(() => {
    for (const name of defaultDepartments) insertDept.run(name);
    for (const [name, description] of defaultRequestTypes) insertType.run(name, description);
    for (const name of defaultProcessingTimes) insertProcessingTime.run(name);
  });

  seedAll();
}
