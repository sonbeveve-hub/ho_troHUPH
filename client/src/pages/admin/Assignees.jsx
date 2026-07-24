import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function Assignees() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const load = () => {
    api.get('/admin/assignees').then(setItems);
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/assignees', { name: name.trim(), email: email.trim(), phone: phone.trim() || null });
      setName('');
      setEmail('');
      setPhone('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, email: item.email, phone: item.phone || '' });
    setError('');
  };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.patch(`/admin/assignees/${id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (item) => {
    await api.patch(`/admin/assignees/${item.id}`, { active: item.active ? 0 : 1 });
    load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Xoá "${item.name}" khỏi danh sách người phụ trách?`)) return;
    await api.delete(`/admin/assignees/${item.id}`);
    load();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Người phụ trách</h1>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Họ và tên"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Số điện thoại (tuỳ chọn)"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <button className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30">
          Thêm
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {items.length > 0 && <p className="text-xs text-slate-400 mb-2">{items.length} người</p>}

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            {editingId === item.id ? (
              <div className="space-y-2">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                  autoFocus
                />
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Số điện thoại"
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
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
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={item.active ? 'text-slate-800' : 'text-slate-400 line-through'}>{item.name}</p>
                  <p className="text-xs text-slate-400">
                    {item.email}
                    {item.phone ? ` — ${item.phone}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-sm">
                  <button onClick={() => startEdit(item)} className="text-brand-600 hover:underline">
                    Sửa
                  </button>
                  <button onClick={() => toggleActive(item)} className="text-brand-600 hover:underline">
                    {item.active ? 'Vô hiệu hoá' : 'Kích hoạt lại'}
                  </button>
                  <button onClick={() => handleDelete(item)} className="text-red-500 hover:underline">
                    Xoá
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400">Chưa có người phụ trách nào.</p>
        )}
      </div>
    </div>
  );
}
