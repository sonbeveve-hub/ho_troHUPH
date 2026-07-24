import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge.jsx';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Mới tiếp nhận' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'done', label: 'Hoàn thành' },
  { value: 'rejected', label: 'Từ chối' },
];

const EMAIL_STATUS_LABEL = {
  sent: 'Đã gửi',
  failed: 'Gửi thất bại',
  skipped_no_config: 'Chưa cấu hình SMTP (bỏ qua)',
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    api.get(`/admin/requests/${id}`).then((data) => {
      setRequest(data);
      setStatus(data.status);
    });
  };

  useEffect(load, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await api.patch(`/admin/requests/${id}`, { status, note });
      setMessage(res.emailSent ? 'Đã cập nhật và gửi email cho người yêu cầu.' : 'Đã cập nhật (email chưa được gửi — kiểm tra cấu hình SMTP).');
      setNote('');
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!request) return <p className="text-slate-400 text-sm">Đang tải...</p>;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 mb-4">
        ← Quay lại danh sách
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-mono">{request.request_code}</p>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {request.requester_name} — {request.request_type_name}
            </h1>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-400">Đơn vị</dt>
            <dd className="text-slate-800">{request.department_name}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Email</dt>
            <dd className="text-slate-800">{request.requester_email}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Thời gian gửi</dt>
            <dd className="text-slate-800">{new Date(request.created_at).toLocaleString('vi-VN')}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Nguồn email</dt>
            <dd className="text-slate-800">{request.email_source}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <dt className="text-slate-400 text-sm">Mô tả</dt>
          <dd className="text-slate-800 mt-1 whitespace-pre-wrap">{request.description}</dd>
        </div>

        {request.attachments?.length > 0 && (
          <div className="mt-4">
            <dt className="text-slate-400 text-sm mb-2">Ảnh đính kèm ({request.attachments.length})</dt>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {request.attachments.map((a) => (
                <a
                  key={a.id}
                  href={`/api/admin/requests/${request.id}/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-square"
                  title={a.original_name}
                >
                  <img
                    src={`/api/admin/requests/${request.id}/attachments/${a.id}`}
                    alt={a.original_name}
                    className="w-full h-full object-cover rounded-lg border border-slate-200 hover:opacity-80 transition"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleUpdate} className="bg-white rounded-2xl border border-slate-100 p-6 mb-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Cập nhật tiến độ</h2>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Ghi chú gửi kèm cho người yêu cầu (tuỳ chọn)..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {message && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu & gửi email'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">Lịch sử trạng thái</h2>
        <ul className="space-y-2">
          {request.history.map((h) => (
            <li key={h.id} className="text-sm flex items-start gap-3">
              <span className="text-slate-400 w-40 shrink-0">
                {new Date(h.changed_at).toLocaleString('vi-VN')}
              </span>
              <span>
                <StatusBadge status={h.status} /> {h.note && <span className="text-slate-600 ml-2">{h.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-3">Nhật ký email</h2>
        {request.emailLog.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có email nào được gửi.</p>
        ) : (
          <ul className="space-y-2">
            {request.emailLog.map((e) => (
              <li key={e.id} className="text-sm flex items-start gap-3">
                <span className="text-slate-400 w-40 shrink-0">
                  {new Date(e.created_at).toLocaleString('vi-VN')}
                </span>
                <span className="text-slate-700">
                  {e.subject} — <span className="text-slate-500">{EMAIL_STATUS_LABEL[e.status] || e.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
