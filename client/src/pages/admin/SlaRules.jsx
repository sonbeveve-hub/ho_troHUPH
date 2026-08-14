import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { PRIORITY_META } from '../../components/StatusBadge.jsx';

export default function SlaRules() {
  const [items, setItems] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [form, setForm] = useState({ requestTypeId: '', priority: '', reminderDays: 2, timeoutDays: 5 });
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const load = () => {
    api.get('/admin/sla-rules').then(setItems);
  };
  useEffect(load, []);
  useEffect(() => {
    api.get('/admin/request-types').then(setRequestTypes);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.requestTypeId) return setError('Vui lòng chọn loại yêu cầu.');
    try {
      await api.post('/admin/sla-rules', form);
      setForm({ requestTypeId: '', priority: '', reminderDays: 2, timeoutDays: 5 });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ reminderDays: item.reminder_days, timeoutDays: item.timeout_days });
  };

  const saveEdit = async (id) => {
    try {
      await api.patch(`/admin/sla-rules/${id}`, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm('Xoá rule này? Yêu cầu sẽ dùng rule chung (theo loại, hoặc mặc định hệ thống) thay thế.')) return;
    await api.delete(`/admin/sla-rules/${item.id}`);
    load();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quy tắc SLA</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Số ngày làm việc trước khi nhắc nhở/tự đóng yêu cầu ở trạng thái "Chờ xác nhận", theo
        loại yêu cầu và (tuỳ chọn) mức ưu tiên. Bỏ trống mức ưu tiên = áp dụng cho mọi mức
        ưu tiên của loại yêu cầu đó. Yêu cầu không khớp rule nào dùng mặc định hệ thống
        (cấu hình trong .env).
      </p>

      <form onSubmit={handleAdd} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 mb-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Thêm rule</h2>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.requestTypeId}
            onChange={(e) => setForm((f) => ({ ...f, requestTypeId: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          >
            <option value="">-- Chọn loại yêu cầu --</option>
            {requestTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          >
            <option value="">Mọi mức ưu tiên</option>
            {Object.entries(PRIORITY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Số ngày nhắc nhở</label>
            <input
              type="number"
              min="1"
              value={form.reminderDays}
              onChange={(e) => setForm((f) => ({ ...f, reminderDays: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Số ngày tự đóng</label>
            <input
              type="number"
              min="1"
              value={form.timeoutDays}
              onChange={(e) => setForm((f) => ({ ...f, timeoutDays: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30"
        >
          Thêm rule
        </button>
      </form>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-slate-800">
                {item.request_type_name || '(loại đã xoá)'}
                {item.priority && ` · ${PRIORITY_META[item.priority]?.label || item.priority}`}
              </p>
              {editingId === item.id ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min="1"
                    value={editForm.reminderDays}
                    onChange={(e) => setEditForm((f) => ({ ...f, reminderDays: e.target.value }))}
                    className="w-20 rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-slate-400">ngày nhắc</span>
                  <input
                    type="number"
                    min="1"
                    value={editForm.timeoutDays}
                    onChange={(e) => setEditForm((f) => ({ ...f, timeoutDays: e.target.value }))}
                    className="w-20 rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-slate-400">ngày đóng</span>
                  <button onClick={() => saveEdit(item.id)} className="text-brand-600 text-sm hover:underline">
                    Lưu
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-500 text-sm hover:underline">
                    Huỷ
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Nhắc sau {item.reminder_days} ngày làm việc · Tự đóng sau {item.timeout_days} ngày làm việc
                </p>
              )}
            </div>
            {editingId !== item.id && (
              <div className="flex items-center gap-3 shrink-0 text-sm">
                <button onClick={() => startEdit(item)} className="text-brand-600 hover:underline">
                  Sửa
                </button>
                <button onClick={() => handleDelete(item)} className="text-red-500 hover:underline">
                  Xoá
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Chưa có rule nào.</p>}
      </div>
    </div>
  );
}
