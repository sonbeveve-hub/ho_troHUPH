import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Trạng thái rỗng dùng chung — icon tròn nhạt + tiêu đề + mô tả phụ, thay cho 1 dòng chữ
// xám đơn điệu, đồng bộ với phong cách minh hoạ dùng ở phần còn lại của trang.
export default function EmptyState({ icon, title, description, className = '' }) {
  return (
    <div className={`text-center py-10 px-4 ${className}`}>
      {icon && (
        <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-brand-50 dark:bg-white/5 flex items-center justify-center text-brand-400 dark:text-ash text-xl">
          <FontAwesomeIcon icon={icon} />
        </div>
      )}
      <p className="text-sm font-medium text-slate-600 dark:text-paper/80">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-500 dark:text-ash">{description}</p>}
    </div>
  );
}
