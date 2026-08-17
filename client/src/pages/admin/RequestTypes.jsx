import { useEffect, useState } from 'react';
import CategoryManager from '../../components/CategoryManager.jsx';
import { PRIORITY_META } from '../../components/StatusBadge.jsx';
import { api } from '../../api/client.js';

export default function RequestTypes() {
  return (
    <>
      <CategoryManager
        title="Loại yêu cầu"
        apiBase="/admin/request-types"
        hasDescription={true}
        importHint="File Excel cần cột 'Tên' và có thể có cột 'Mô tả'."
      />
      <DefaultPriorityManager />
    </>
  );
}

// Mức độ ưu tiên mặc định cho mỗi loại yêu cầu (tự động gán khi có yêu cầu mới) — nằm ngoài
// CategoryManager (dùng chung cho 3 danh mục khác) vì đây là field riêng chỉ loại yêu cầu có.
function DefaultPriorityManager() {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(null);

  const load = () => {
    api.get('/admin/request-types').then(setItems);
  };
  useEffect(load, []);

  const handleChange = async (id, defaultPriority) => {
    setSaving(id);
    try {
      await api.patch(`/admin/request-types/${id}/default-priority`, { defaultPriority });
      load();
    } finally {
      setSaving(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="max-w-2xl mt-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Mức độ ưu tiên mặc định</h2>
      <p className="text-sm text-slate-500 mb-4">
        Tự động gán cho yêu cầu mới thuộc loại này (người gửi không tự chọn). Quản lý vẫn có thể
        sửa tay tại trang chi tiết từng yêu cầu.
      </p>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <span className={item.active ? 'text-slate-800' : 'text-slate-500 line-through'}>{item.name}</span>
            <select
              value={item.default_priority}
              onChange={(e) => handleChange(item.id, e.target.value)}
              disabled={saving === item.id}
              className="rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-sm disabled:opacity-60"
            >
              {Object.entries(PRIORITY_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
