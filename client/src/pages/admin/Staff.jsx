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

  const handleDelete = async (id) => {
    await api.delete(`/admin/staff/${id}`);
    load();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Danh sách nhân sự</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Import Excel
        </button>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-3 gap-2 mb-3">
        <input
          value={newStaff.name}
          onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
          placeholder="Họ tên"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={newStaff.email}
          onChange={(e) => setNewStaff((s) => ({ ...s, email: e.target.value }))}
          placeholder="Email"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={newStaff.departmentId}
          onChange={(e) => setNewStaff((s) => ({ ...s, departmentId: e.target.value }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">-- Đơn vị --</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button className="col-span-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          Thêm nhân sự
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo tên..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4"
      />

      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
        {items.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-slate-800">{s.name}</p>
              <p className="text-xs text-slate-400">
                {s.email || 'chưa có email'} · {s.department_name || 'chưa rõ đơn vị'}
              </p>
            </div>
            <button onClick={() => handleDelete(s.id)} className="text-sm text-red-500 hover:underline">
              Xoá
            </button>
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
