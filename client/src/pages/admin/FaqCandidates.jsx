import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function FaqCandidates() {
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    api.get('/admin/faq-candidates?status=pending').then(setItems);
  };
  useEffect(load, []);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ question: item.suggested_question, answer: item.suggested_answer });
    setError('');
  };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.patch(`/admin/faq-candidates/${id}`, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async (item) => {
    setBusyId(item.id);
    setError('');
    try {
      await api.post(`/admin/faq-candidates/${item.id}/approve`, {});
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (item) => {
    if (!confirm('Từ chối đề xuất này? Nhóm yêu cầu này sẽ không được đề xuất lại.')) return;
    setBusyId(item.id);
    setError('');
    try {
      await api.post(`/admin/faq-candidates/${item.id}/reject`, {});
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Đề xuất FAQ (chờ duyệt)</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Hệ thống tự nhóm các yêu cầu đã Hoàn thành có giải pháp tương tự nhau (quét định kỳ
        hàng ngày). Sửa câu hỏi/trả lời cho tự nhiên trước khi duyệt — sau khi duyệt sẽ tạo
        thành mục trong{' '}
        <Link to="/admin/faq" className="text-brand-600 hover:underline">
          Cơ sở tri thức
        </Link>
        .
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5"
          >
            <p className="text-xs text-slate-400 mb-2">
              Từ {item.request_ids.length} yêu cầu tương tự — mã ID: {item.request_ids.join(', ')}
            </p>
            {editingId === item.id ? (
              <div className="space-y-2">
                <input
                  value={editForm.question}
                  onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium"
                  autoFocus
                />
                <textarea
                  value={editForm.answer}
                  onChange={(e) => setEditForm((f) => ({ ...f, answer: e.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
                />
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
              <>
                <p className="font-medium text-slate-900">{item.suggested_question}</p>
                <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{item.suggested_answer}</p>
              </>
            )}

            {editingId !== item.id && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleApprove(item)}
                  disabled={busyId === item.id}
                  className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
                >
                  ✅ Duyệt
                </button>
                <button
                  onClick={() => startEdit(item)}
                  className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Sửa trước khi duyệt
                </button>
                <button
                  onClick={() => handleReject(item)}
                  disabled={busyId === item.id}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  ❌ Từ chối
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">Chưa có đề xuất nào đang chờ duyệt.</p>
        )}
      </div>
    </div>
  );
}
