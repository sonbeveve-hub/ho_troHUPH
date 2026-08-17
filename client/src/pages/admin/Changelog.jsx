import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';

// Danh sách tĩnh, cập nhật tay mỗi khi có thay đổi lớn — đơn giản và đủ dùng cho 1 hệ thống
// nội bộ quy mô nhỏ, không cần dựng hẳn 1 bảng CSDL + trang quản trị riêng cho việc này.
const VERSIONS = [
  {
    version: 'v3.4.0',
    date: '14/08/2026',
    items: [
      'Vai trò "Người phụ trách" (handler) — chỉ thấy Tổng quan + Yêu cầu, có nút "Của tôi" lọc theo yêu cầu được phân công.',
      'Cấp tài khoản đăng nhập trực tiếp từ hồ sơ Nhân sự (dùng email nhân sự làm tài khoản), quản lý vai trò/mật khẩu ngay tại đó.',
      'Thêm số điện thoại vào hồ sơ nhân sự.',
      'Báo cáo tổng quan tự động gửi kèm Excel vào mùng 2 hằng tháng.',
      'Trang này — xem lại các đợt cập nhật hệ thống.',
    ],
  },
  {
    version: 'v3.3.0',
    date: '14/08/2026',
    items: [
      'Thiết kế lại 3 trang công khai (gửi yêu cầu/tra cứu/FAQ) theo phong cách card + minh hoạ, thêm hiệu ứng cuộn/động.',
      'Đổi bộ icon sang FontAwesome, đổi font sang Be Vietnam Pro (hỗ trợ tiếng Việt đầy đủ).',
      'Sửa gửi trùng email khi cập nhật trạng thái + phân công cùng lúc.',
      '2 nút "Đã khắc phục / Chưa khắc phục" ngay trong email xác nhận.',
      'Email mời đánh giá hài lòng sau khi yêu cầu đóng (bù cho xác nhận 1 chạm/tự động đóng).',
    ],
  },
  {
    version: 'v3.2',
    date: '14/08/2026',
    items: [
      'Logo trường + xác nhận "1 chạm" ngay từ email, không cần vào trang bấm lại.',
      'Giao diện email: banner thương hiệu, nút CTA thay cho link chữ trơn.',
    ],
  },
  {
    version: 'v3.1',
    date: '14/08/2026',
    items: [
      'Quy tắc SLA riêng theo loại yêu cầu × mức ưu tiên, tính hạn theo ngày làm việc (bỏ qua T7/CN + ngày nghỉ lễ).',
      'Phát hiện trùng lặp theo nội dung mô tả (không cần trùng email/loại yêu cầu).',
      'Đề xuất FAQ bán tự động từ các yêu cầu đã xử lý tương tự nhau.',
    ],
  },
  {
    version: 'v3.0',
    date: '14/08/2026',
    items: [
      'Tài khoản quản trị cá nhân hoá (super_admin/admin) thay tài khoản dùng chung.',
      'Nhật ký audit — ghi lại mọi thay đổi quan trọng.',
      'Mức độ ưu tiên P1–P4 tự gán theo loại yêu cầu.',
    ],
  },
  {
    version: 'v2.1',
    date: '14/08/2026',
    items: [
      'Mức độ ưu tiên, phát hiện trùng lặp (email + loại), xuất báo cáo Excel.',
      'Cơ sở tri thức (FAQ) công khai.',
    ],
  },
  {
    version: 'v2.0',
    date: '14/08/2026',
    items: [
      'Quy trình "Xác nhận hoàn thành": người gửi xác nhận/từ chối trước khi đóng yêu cầu.',
      'Tự động nhắc nhở và tự đóng nếu không phản hồi.',
    ],
  },
  {
    version: 'v1.1',
    date: '27/07 – 05/08/2026',
    items: [
      'Trợ lý AI (Gemini) gợi ý khắc phục sự cố ngay sau khi gửi yêu cầu.',
      'Chụp ảnh trực tiếp từ camera, chat qua lại nhiều lượt với AI.',
    ],
  },
  {
    version: 'v1.0',
    date: '24/07/2026',
    items: [
      'Ra mắt hệ thống: gửi yêu cầu công khai, dashboard quản trị, đính kèm ảnh, email xác nhận, quản lý danh mục, trang tra cứu công khai.',
    ],
  },
];

export default function Changelog() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Thông tin cập nhật</h1>
      <p className="text-sm text-slate-500 mb-6">Lịch sử các đợt cập nhật của hệ thống, mới nhất ở trên.</p>

      <div className="space-y-4">
        {VERSIONS.map((v) => (
          <div
            key={v.version}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg shadow-emerald-900/5 border border-white/60 p-5"
          >
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-bold text-slate-900">{v.version}</h2>
              <span className="text-xs text-slate-400">{v.date}</span>
            </div>
            <ul className="space-y-1.5">
              {v.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-brand-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
