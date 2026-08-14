import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';

export default function Holidays() {
  const [items, setItems] = useState([]);
  const [pickedDate, setPickedDate] = useState(''); // luôn dạng YYYY-MM-DD từ input type=date
  const [name, setName] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    api.get('/admin/holidays').then(setItems);
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!pickedDate || !name.trim()) return;
    // recurring=true → chỉ lưu MM-DD (lặp lại hàng năm, bỏ năm đã chọn); ngược lại lưu cả năm.
    const date = recurring ? pickedDate.slice(5) : pickedDate;
    try {
      await api.post('/admin/holidays', { date, name: name.trim(), recurring });
      setPickedDate('');
      setName('');
      setRecurring(true);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Xoá ngày nghỉ "${item.name}"?`)) return;
    await api.delete(`/admin/holidays/${item.id}`);
    load();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Ngày nghỉ lễ</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Import Excel
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Dùng để tính hạn nhắc nhở/tự đóng theo ngày làm việc (bỏ qua Thứ 7/Chủ nhật và các
        ngày này). Ngày dương lịch cố định (Tết Dương lịch, 30/4, 1/5, Quốc khánh) đã được
        thêm sẵn và lặp lại hàng năm. Tết Nguyên đán và ngày âm lịch khác cần nhập tay mỗi
        năm vì ngày dương lịch tương ứng thay đổi.
      </p>

      <form onSubmit={handleAdd} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 mb-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên ngày nghỉ"
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Lặp lại hàng năm (ngày dương lịch cố định)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30"
        >
          Thêm ngày nghỉ
        </button>
      </form>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-slate-800">{item.name}</span>
              <span className="ml-2 text-xs text-slate-400">
                {item.date} {item.recurring ? '(hàng năm)' : ''}
              </span>
            </div>
            <button onClick={() => handleDelete(item)} className="text-sm text-red-500 hover:underline">
              Xoá
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Chưa có ngày nghỉ nào.</p>}
      </div>

      {showImport && (
        <ExcelImportModal
          title="Import danh sách ngày nghỉ"
          importPath="/admin/holidays/import"
          hint="Cột 'Ngày' (DD/MM hoặc DD/MM/YYYY), 'Tên', và 'Lặp lại' tuỳ chọn (Có/Không)."
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
