import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function FaqList() {
  const [items, setItems] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({ question: '', answer: '', requestTypeId: '' });
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    api.get(`/admin/faq?${params.toString()}`).then(setItems);
  };

  useEffect(load, [q]);
  useEffect(() => {
    api.get('/admin/request-types').then(setRequestTypes);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      await api.post('/admin/faq', {
        question: form.question.trim(),
        answer: form.answer.trim(),
        requestTypeId: form.requestTypeId || null,
      });
      setForm({ question: '', answer: '', requestTypeId: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      question: item.question,
      answer: item.answer,
      requestTypeId: item.request_type_id ? String(item.request_type_id) : '',
    });
    setError('');
  };

  const saveEdit = async (id) => {
    setError('');
    if (!editForm.question.trim() || !editForm.answer.trim()) return;
    try {
      await api.patch(`/admin/faq/${id}`, {
        question: editForm.question.trim(),
        answer: editForm.answer.trim(),
        requestTypeId: editForm.requestTypeId || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (item) => {
    await api.patch(`/admin/faq/${item.id}`, { active: item.active ? 0 : 1 });
    load();
  };

  const handleDelete = async (item) => {
    if (!confirm('Xoá mục FAQ này?')) return;
    await api.delete(`/admin/faq/${item.id}`);
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cơ sở tri thức (FAQ)</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Các câu hỏi thường gặp được dùng làm ngữ cảnh cho Trợ lý AI khi gợi ý khắc phục, và hiển
        thị công khai tại trang{' '}
        <a href="/faq" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
          /faq
        </a>
        .
      </p>

      <form onSubmit={handleAdd} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 mb-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Thêm mới</h2>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Câu hỏi</label>
          <input
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Câu trả lời</label>
          <textarea
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Loại yêu cầu liên quan (tuỳ chọn)</label>
          <select
            value={form.requestTypeId}
            onChange={(e) => setForm((f) => ({ ...f, requestTypeId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          >
            <option value="">-- Áp dụng chung --</option>
            {requestTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Thêm FAQ'}
        </button>
      </form>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo câu hỏi hoặc câu trả lời..."
        className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm mb-4"
      />

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-4">
            {editingId === item.id ? (
              <div className="space-y-2">
                <input
                  value={editForm.question}
                  onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                  autoFocus
                />
                <textarea
                  value={editForm.answer}
                  onChange={(e) => setEditForm((f) => ({ ...f, answer: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                />
                <select
                  value={editForm.requestTypeId}
                  onChange={(e) => setEditForm((f) => ({ ...f, requestTypeId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                >
                  <option value="">-- Áp dụng chung --</option>
                  {requestTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(item.id)}
                    className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-3 py-1.5 text-xs font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <p className={item.active ? 'font-medium text-slate-900' : 'font-medium text-slate-400 line-through'}>
                    {item.question}
                  </p>
                  <div className="flex items-center gap-3 shrink-0 text-sm">
                    <button onClick={() => startEdit(item)} className="text-brand-600 hover:underline">
                      Sửa
                    </button>
                    <button onClick={() => toggleActive(item)} className="text-brand-600 hover:underline">
                      {item.active ? 'Ẩn' : 'Hiện lại'}
                    </button>
                    <button onClick={() => handleDelete(item)} className="text-red-500 hover:underline">
                      Xoá
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{item.answer}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {item.request_type_name || 'Áp dụng chung'}
                  {item.source_request_code && ` · Tạo từ ${item.source_request_code}`}
                </p>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="px-5 py-8 text-sm text-slate-400">Chưa có mục FAQ nào.</p>}
      </div>
    </div>
  );
}
