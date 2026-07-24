import { useState } from 'react';
import { api } from '../api/client.js';

export default function ExcelImportModal({ title, importPath, hint, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) return setError('Vui lòng chọn file Excel (.xlsx).');
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(importPath, formData);
      setResult(res);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}

        <div className="mt-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:px-3 file:py-2"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            Đã thêm mới {result.inserted}, cập nhật {result.updated}
            {result.errors?.length ? `, ${result.errors.length} dòng lỗi` : ''}.
            {result.errors?.length > 0 && (
              <ul className="mt-1 list-disc list-inside text-xs">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>
                    Dòng {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Đóng
          </button>
          <button
            onClick={handleImport}
            disabled={loading}
            className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
          >
            {loading ? 'Đang import...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
