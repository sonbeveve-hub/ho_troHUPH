import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';

// Cặp bg-{màu}-50/text-{màu}-700 (sáng) đi cùng dark:bg-{màu}-500/10 dark:text-{màu}-300 (tối)
// — cùng 1 sắc màu, chỉ đổi độ đậm/độ mờ cho hợp nền tối, không đổi ý nghĩa màu giữa 2 chế độ.
const STATUS_META = {
  new: { label: 'Mới tiếp nhận', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  in_progress: { label: 'Đang xử lý', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  resolved_pending: {
    label: 'Đã xử lý - Chờ xác nhận',
    className: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300',
  },
  reopened: { label: 'Mở lại', className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' },
  done: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700 dark:bg-mint/10 dark:text-mint' },
  done_auto: { label: 'Đã đóng (tự động)', className: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-ash' },
  rejected: { label: 'Từ chối', className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-ash',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function ProcessingTimeBadge({ name }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
      {name} ngày
    </span>
  );
}

const PRIORITY_META = {
  P1: { label: 'P1 - Khẩn cấp', className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' },
  P2: { label: 'P2 - Cao', className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' },
  P3: { label: 'P3 - Bình thường', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
  P4: { label: 'P4 - Thấp', className: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-ash' },
};

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      <FontAwesomeIcon icon={faFlag} className="mr-1" />
      {meta.label}
    </span>
  );
}

export { STATUS_META, PRIORITY_META };
