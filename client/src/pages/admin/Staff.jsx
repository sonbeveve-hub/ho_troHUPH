import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';

export default function Staff() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [q, setQ] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', departmentId: '' });
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editStaff, setEditStaff] = useState({ name: '', email: '', departmentId: '' });

  const load = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    api.get(`/admin/staff?${params.toString()}`).then((res) => setItems(res.data));
  };

  useEffect(() => {
    api.get('/admin/departments').then(setDepartments);
  }, []);
  useEffect(load, [q]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!newStaff.name.trim()) return;
    try {
      await api.post('/admin/staff', {
        name: newStaff.name.trim(),
        email: newStaff.email.trim() || null,
        departmentId: newStaff.departmentId || null,
      });
      setNewStaff({ name: '', email: '', departmentId: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditStaff({ name: s.name, email: s.email || '', departmentId: s.department_id ? String(s.department_id) : '' });
    setError('');
  };

  const saveEdit = async (id) => {
    setError('');
    if (!editStaff.name.trim()) return;
    try {
      await api.patch(`/admin/staff/${id}`, {
        name: editStaff.name.trim(),
        email: editStaff.email.trim() || null,
        departmentId: editStaff.departmentId || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Xoá "${item.name}"?`)) return;
    await api.delete(`/admin/staff/${item.id}`);
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Danh sách nhân sự</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Import Excel
        </button>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-3 gap-2 mb-3">
        <input
          value={newStaff.name}
          onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
          placeholder="Họ tên"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <input
          value={newStaff.email}
          onChange={(e) => setNewStaff((s) => ({ ...s, email: e.target.value }))}
          placeholder="Email"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <select
          value={newStaff.departmentId}
          onChange={(e) => setNewStaff((s) => ({ ...s, departmentId: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        >
          <option value="">-- Đơn vị --</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button className="col-span-3 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30">
          Thêm nhân sự
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo tên..."
        className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm mb-4"
      />

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((s) => (
          <div key={s.id} className="px-4 py-3">
            {editingId === s.id ? (
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={editStaff.name}
                  onChange={(e) => setEditStaff((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                  autoFocus
                />
                <input
                  value={editStaff.email}
                  onChange={(e) => setEditStaff((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                />
                <select
                  value={editStaff.departmentId}
                  onChange={(e) => setEditStaff((f) => ({ ...f, departmentId: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                >
                  <option value="">-- Đơn vị --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <div className="col-span-3 flex gap-2">
                  <button
                    onClick={() => saveEdit(s.id)}
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">
                    {s.email || 'chưa có email'} · {s.department_name || 'chưa rõ đơn vị'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={() => startEdit(s)} className="text-brand-600 hover:underline">
                    Sửa
                  </button>
                  <button onClick={() => handleDelete(s)} className="text-red-500 hover:underline">
                    Xoá
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Chưa có nhân sự nào.</p>}
      </div>

      {showImport && (
        <ExcelImportModal
          title="Import danh sách nhân sự"
          importPath="/admin/staff/import"
          hint="File Excel cần cột 'Họ tên', 'Email', 'Khoa/phòng/đơn vị'."
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
