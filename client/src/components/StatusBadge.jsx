const STATUS_META = {
  new: { label: 'Mới tiếp nhận', className: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'Đang xử lý', className: 'bg-amber-50 text-amber-700' },
  done: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Từ chối', className: 'bg-red-50 text-red-700' },
};

const PRIORITY_META = {
  gap: { label: 'Gấp', className: 'bg-rose-50 text-rose-700' },
  binh_thuong: { label: 'Bình thường', className: 'bg-blue-50 text-blue-700' },
  khong_gap: { label: 'Không gấp', className: 'bg-emerald-50 text-emerald-700' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || { label: priority, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export { STATUS_META, PRIORITY_META };
