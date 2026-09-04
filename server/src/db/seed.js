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

// Chỉ 4 ngày lễ dương lịch cố định — Tết Nguyên đán và các ngày âm lịch khác phải nhập tay
// mỗi năm (xem trang "/admin/holidays"), vì ngày dương lịch tương ứng đổi theo từng năm.
const defaultHolidays = [
  ['01-01', 'Tết Dương lịch'],
  ['04-30', 'Ngày Giải phóng miền Nam'],
  ['05-01', 'Ngày Quốc tế Lao động'],
  ['09-02', 'Ngày Quốc khánh'],
];

// Chỉ seed từng bảng khi bảng đó ĐANG RỖNG (cài đặt mới hoàn toàn). Trước đây seed() chạy
// vô điều kiện mỗi lần server khởi động, dùng INSERT OR IGNORE theo tên — nhưng OR IGNORE chỉ
// bỏ qua khi tên còn y nguyên, nên mỗi khi admin xoá hoặc đổi tên 1 mục mặc định, lần khởi động
// kế tiếp sẽ tạo lại y hệt mục đó (hồi sinh mục đã xoá / tạo bản trùng cho mục đã đổi tên).
export async function seed() {
  const deptCount = (await db.get('SELECT COUNT(*) AS c FROM departments')).c;
  const typeCount = (await db.get('SELECT COUNT(*) AS c FROM request_types')).c;
  const processingTimeCount = (await db.get('SELECT COUNT(*) AS c FROM processing_times')).c;
  const holidayCount = (await db.get('SELECT COUNT(*) AS c FROM holidays')).c;

  await db.transaction(async (tx) => {
    if (Number(deptCount) === 0) {
      for (const [index, name] of defaultDepartments.entries()) {
        await tx.run(
          'INSERT INTO departments (name, sort_order) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
          [name, index + 1]
        );
      }
    }
    if (Number(typeCount) === 0) {
      for (const [index, [name, description]] of defaultRequestTypes.entries()) {
        await tx.run(
          'INSERT INTO request_types (name, description, sort_order) VALUES (?, ?, ?) ON CONFLICT (name) DO NOTHING',
          [name, description, index + 1]
        );
      }
    }
    if (Number(processingTimeCount) === 0) {
      for (const [index, name] of defaultProcessingTimes.entries()) {
        await tx.run(
          'INSERT INTO processing_times (name, sort_order) VALUES (?, ?) ON CONFLICT (name) DO NOTHING',
          [name, index + 1]
        );
      }
    }
    if (Number(holidayCount) === 0) {
      for (const [date, name] of defaultHolidays) {
        await tx.run('INSERT INTO holidays (date, name, recurring) VALUES (?, ?, 1)', [date, name]);
      }
    }
  });
}
