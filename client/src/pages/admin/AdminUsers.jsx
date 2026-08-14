import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const ROLE_LABEL = { super_admin: 'Quản trị cấp cao', admin: 'Quản lý' };

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'admin' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const load = () => {
    api.get('/admin/users').then(setItems);
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/admin/users', form);
      setForm({ fullName: '', email: '', password: '', role: 'admin' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ fullName: item.full_name || '', role: item.role, status: item.status });
    setError('');
  };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.patch(`/admin/users/${id}`, {
        fullName: editForm.fullName,
        role: editForm.role,
        status: editForm.status,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleStatus = async (item) => {
    setError('');
    try {
      await api.patch(`/admin/users/${item.id}`, { status: item.status === 'active' ? 'disabled' : 'active' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý tài khoản</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Chỉ tài khoản "Quản trị cấp cao" mới thấy và thao tác được trang này.
      </p>

      <form onSubmit={handleAdd} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 mb-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Thêm tài khoản</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Họ và tên"
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
          <input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email (dùng để đăng nhập)"
            type="email"
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
          <input
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Mật khẩu (tối thiểu 8 ký tự)"
            type="password"
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          >
            <option value="admin">Quản lý</option>
            <option value="super_admin">Quản trị cấp cao</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Thêm tài khoản'}
        </button>
      </form>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-4">
            {editingId === item.id ? (
              <div className="space-y-2">
                <input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                  autoFocus
                />
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                >
                  <option value="admin">Quản lý</option>
                  <option value="super_admin">Quản trị cấp cao</option>
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
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={item.status === 'active' ? 'text-slate-800' : 'text-slate-400 line-through'}>
                    {item.full_name || item.username}
                  </p>
                  <p className="text-xs text-slate-400">
                    {item.email || item.username} · {ROLE_LABEL[item.role] || item.role}
                    {item.last_login_at && ` · Đăng nhập gần nhất: ${new Date(item.last_login_at).toLocaleString('vi-VN')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-sm">
                  <button onClick={() => startEdit(item)} className="text-brand-600 hover:underline">
                    Sửa
                  </button>
                  <button onClick={() => toggleStatus(item)} className="text-brand-600 hover:underline">
                    {item.status === 'active' ? 'Khoá' : 'Mở khoá'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="px-5 py-8 text-sm text-slate-400">Chưa có tài khoản nào.</p>}
      </div>
    </div>
  );
}
