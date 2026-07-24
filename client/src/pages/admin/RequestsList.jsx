import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge.jsx';

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'new', label: 'Mới tiếp nhận' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'done', label: 'Hoàn thành' },
  { value: 'rejected', label: 'Từ chối' },
];

export default function RequestsList() {
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [requestTypeId, setRequestTypeId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [departments, setDepartments] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [result, setResult] = useState({ data: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/departments').then(setDepartments).catch(() => {});
    api.get('/request-types').then(setRequestTypes).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (departmentId) params.set('department_id', departmentId);
    if (requestTypeId) params.set('request_type_id', requestTypeId);
    if (q) params.set('q', q);

    api
      .get(`/admin/requests?${params.toString()}`)
      .then(setResult)
      .finally(() => setLoading(false));
  }, [status, departmentId, requestTypeId, q, page]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Yêu cầu hỗ trợ</h1>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setStatus(t.value);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              status === t.value
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên, mã yêu cầu, email..."
          className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tất cả loại yêu cầu</option>
          {requestTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Đang tải...</p>
      ) : result.data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">
          Không có yêu cầu nào phù hợp.
        </div>
      ) : (
        <div className="space-y-3">
          {result.data.map((r) => (
            <Link
              key={r.id}
              to={`/admin/requests/${r.id}`}
              className="block bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {r.requester_name} — {r.request_type_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{r.description}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <StatusBadge status={r.status} />
                <PriorityBadge priority={r.priority} />
                <span className="font-mono">{r.request_code}</span>
                <span>· {r.department_name}</span>
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
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm text-slate-500">
            Trang {page}/{totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
