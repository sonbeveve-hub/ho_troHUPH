import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTriangleExclamation, faInbox as faInboxIcon } from '@fortawesome/free-solid-svg-icons';
import { api } from '../../api/client.js';
import { StatusBadge, ProcessingTimeBadge, PriorityBadge, PRIORITY_META } from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { ListSkeleton } from '../../components/Skeleton.jsx';

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'new', label: 'Mới tiếp nhận', showCount: true },
  { value: 'in_progress', label: 'Đang xử lý', showCount: true },
  { value: 'resolved_pending', label: 'Chờ xác nhận', showCount: true },
  { value: 'reopened', label: 'Mở lại' },
  { value: 'done', label: 'Hoàn thành' },
  { value: 'done_auto', label: 'Tự động đóng' },
  { value: 'rejected', label: 'Từ chối' },
];

export default function RequestsList() {
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [requestTypeId, setRequestTypeId] = useState('');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [departments, setDepartments] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [result, setResult] = useState({ data: [], total: 0, pageSize: 20 });
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [me, setMe] = useState(null);
  // Mặc định lọc "Của tôi" khi tài khoản là người phụ trách (handler) — để đăng nhập vào là
  // thấy ngay yêu cầu được phân công cho mình, không cần tự tìm. Vẫn cho bấm "Tất cả" nếu cần
  // xem toàn bộ hàng đợi (không hạn chế cứng, chỉ đổi mặc định).
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);

  useEffect(() => {
    api.get('/departments').then(setDepartments).catch(() => {});
    api.get('/request-types').then(setRequestTypes).catch(() => {});
    api
      .get('/admin/me')
      .then((data) => {
        setMe(data);
        if (data.role === 'handler') setAssignedToMeOnly(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (departmentId) params.set('department_id', departmentId);
    if (requestTypeId) params.set('request_type_id', requestTypeId);
    if (priority) params.set('priority', priority);
    if (q) params.set('q', q);
    if (assignedToMeOnly && me?.username) params.set('assignee_email', me.username);

    api
      .get(`/admin/requests?${params.toString()}`)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, departmentId, requestTypeId, priority, q, page, assignedToMeOnly, me]);

  // Bộ đếm cho các tab — dùng CÙNG bộ lọc với danh sách nhưng KHÔNG kèm status/page, để số đếm
  // trên từng tab luôn khớp với các bộ lọc khác đang áp dụng (đơn vị, loại yêu cầu, "Của tôi"...).
  useEffect(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('department_id', departmentId);
    if (requestTypeId) params.set('request_type_id', requestTypeId);
    if (priority) params.set('priority', priority);
    if (q) params.set('q', q);
    if (assignedToMeOnly && me?.username) params.set('assignee_email', me.username);

    api
      .get(`/admin/requests/counts?${params.toString()}`)
      .then(setCounts)
      .catch(() => {});
  }, [departmentId, requestTypeId, priority, q, assignedToMeOnly, me]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Yêu cầu hỗ trợ</h1>
        {me?.username && (
          <button
            onClick={() => {
              setAssignedToMeOnly((v) => !v);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              assignedToMeOnly
                ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-md shadow-brand-500/30'
                : 'border border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
            }`}
          >
            {assignedToMeOnly ? 'Của tôi' : 'Tất cả'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-4 border-b border-slate-200">
        {TABS.map((t) => {
          const count = t.showCount ? counts[t.value] || 0 : 0;
          return (
            <button
              key={t.value}
              onClick={() => {
                setStatus(t.value);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                status === t.value
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
              {t.showCount && count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-xs font-semibold ${
                    status === t.value ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên, mã yêu cầu, email..."
          className="flex-1 min-w-[220px] rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        >
          <option value="">Tất cả đơn vị</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={requestTypeId}
          onChange={(e) => {
            setRequestTypeId(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        >
          <option value="">Tất cả loại yêu cầu</option>
          {requestTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        >
          <option value="">Tất cả mức độ ưu tiên</option>
          {Object.entries(PRIORITY_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {!loading && !error && result.data.length > 0 && (
        <p className="text-xs text-slate-500 mb-2">{result.total} yêu cầu</p>
      )}

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-red-900/5 border border-red-100/60 p-10 text-center text-red-600">
          Không tải được danh sách: {error}
        </div>
      ) : result.data.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60">
          <EmptyState
            icon={faInboxIcon}
            title="Không có yêu cầu nào phù hợp"
            description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {result.data.map((r) => (
            <Link
              key={r.id}
              to={`/admin/requests/${r.id}`}
              className="block bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {r.requester_name} — {r.request_type_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{r.description}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <StatusBadge status={r.status} />
                <PriorityBadge priority={r.priority} />
                <ProcessingTimeBadge name={r.processing_time_name} />
                <span className="font-mono">{r.request_code}</span>
                <span>· {r.department_name}</span>
                {r.attachment_count > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <FontAwesomeIcon icon={faPaperclip} /> {r.attachment_count}
                  </span>
                )}
                {r.escalated_at && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700">
                    <FontAwesomeIcon icon={faTriangleExclamation} /> Cần chú ý
                  </span>
                )}
                {r.duplicate_of_code && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
                    <FontAwesomeIcon icon={faTriangleExclamation} /> Có thể trùng {r.duplicate_of_code}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm text-slate-500">
            Trang {page}/{totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
