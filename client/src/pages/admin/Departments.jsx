import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';

export default function Departments() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    api.get('/admin/departments').then(setItems);
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.post('/admin/departments', { name: name.trim() });
      setName('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (item) => {
    await api.patch(`/admin/departments/${item.id}`, { active: item.active ? 0 : 1 });
    load();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Khoa/phòng/đơn vị</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Import Excel
        </button>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên đơn vị mới"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          Thêm
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-3">
            <span className={item.active ? 'text-slate-800' : 'text-slate-400 line-through'}>
              {item.name}
            </span>
            <button
              onClick={() => toggleActive(item)}
              className="text-sm text-brand-600 hover:underline"
            >
              {item.active ? 'Vô hiệu hoá' : 'Kích hoạt lại'}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Chưa có đơn vị nào.</p>}
      </div>

      {showImport && (
        <ExcelImportModal
          title="Import danh sách đơn vị"
          importPath="/admin/departments/import"
          hint="File Excel cần 1 cột 'Tên'."
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
