const STATUS_META = {
  new: { label: 'Mới tiếp nhận', className: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'Đang xử lý', className: 'bg-amber-50 text-amber-700' },
  resolved_pending: { label: 'Đã xử lý - Chờ xác nhận', className: 'bg-yellow-50 text-yellow-700' },
  reopened: { label: 'Mở lại', className: 'bg-orange-50 text-orange-700' },
  done: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700' },
  done_auto: { label: 'Đã đóng (tự động)', className: 'bg-slate-100 text-slate-500' },
  rejected: { label: 'Từ chối', className: 'bg-red-50 text-red-700' },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export function ProcessingTimeBadge({ name }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-50 text-violet-700">
      {name} ngày
    </span>
  );
}

export function PriorityBadge({ name }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-50 text-rose-700">
      ⚑ {name}
    </span>
  );
}

export { STATUS_META };
