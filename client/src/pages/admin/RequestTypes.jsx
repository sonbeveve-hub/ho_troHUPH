import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';

export default function RequestTypes() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    api.get('/admin/request-types').then(setItems);
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.post('/admin/request-types', { name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (item) => {
    await api.patch(`/admin/request-types/${item.id}`, { active: item.active ? 0 : 1 });
    load();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Loại yêu cầu</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Import Excel
        </button>
      </div>

      <form onSubmit={handleAdd} className="space-y-2 mb-5">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên loại yêu cầu mới"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Thêm
          </button>
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả (tuỳ chọn)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className={item.active ? 'text-slate-800' : 'text-slate-400 line-through'}>{item.name}</p>
              {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
            </div>
            <button onClick={() => toggleActive(item)} className="text-sm text-brand-600 hover:underline">
              {item.active ? 'Vô hiệu hoá' : 'Kích hoạt lại'}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Chưa có loại yêu cầu nào.</p>}
      </div>

      {showImport && (
        <ExcelImportModal
          title="Import danh sách loại yêu cầu"
          importPath="/admin/request-types/import"
          hint="File Excel cần cột 'Tên' và có thể có cột 'Mô tả'."
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
