import { db } from './index.js';

const defaultDepartments = [
  // Đơn vị chức năng
  'Phòng Quản lý đào tạo',
  'Phòng Quản lý Học viên và sinh viên',
  'Phòng Quản lý Khoa học và Hợp tác Phát triển',
  'Phòng Tài chính - Kế toán',
  'Phòng Tổ chức - Hành chính',
  'Phòng Quản trị - Dịch vụ',
  'Phòng Khảo thí và Bảo đảm chất lượng',
  // Khoa, viện
  'Viện Đào tạo bồi dưỡng cán bộ quản lý ngành y tế',
  'Khoa các Khoa học cơ bản',
  'Khoa Khoa học xã hội và Hành vi',
  'Khoa Sức khỏe môi trường và Nghề nghiệp',
  'Khoa Y học cơ sở',
  'Khoa Y học lâm sàng',
  // Trung tâm
  'Trung tâm xét nghiệm',
  'Trung tâm nghiên cứu chính sách PCCT (CIPPR)',
  'Trung tâm nghiên cứu YTCC và HST (CENPHER)',
  'Trung tâm nghiên cứu khoa học sức khỏe (CPHS)',
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
