import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ExcelImportModal from './ExcelImportModal.jsx';

export default function CategoryManager({ title, apiBase, hasDescription, importHint }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const load = () => {
    api.get(apiBase).then(setItems);
  };
  useEffect(load, [apiBase]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.post(apiBase, { name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setError('');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id) => {
    setError('');
    if (!editName.trim()) return;
    try {
      await api.patch(`${apiBase}/${id}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (item) => {
    await api.patch(`${apiBase}/${item.id}`, { active: item.active ? 0 : 1 });
    load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Xoá "${item.name}"? Hành động này không thể hoàn tác.`)) return;
    setError('');
    try {
      await api.delete(`${apiBase}/${item.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
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
            placeholder={`Tên ${title.toLowerCase()} mới`}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Thêm
          </button>
        </div>
        {hasDescription && (
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả (tuỳ chọn)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            {editingId === item.id ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  autoFocus
                />
                {hasDescription && (
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Mô tả (tuỳ chọn)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(item.id)}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={item.active ? 'text-slate-800' : 'text-slate-400 line-through'}>
                    {item.name}
                  </p>
                  {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
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
          <p className="px-4 py-6 text-sm text-slate-400">Chưa có {title.toLowerCase()} nào.</p>
        )}
      </div>

      {showImport && (
        <ExcelImportModal
          title={`Import danh sách ${title.toLowerCase()}`}
          importPath={`${apiBase}/import`}
          hint={importHint}
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
