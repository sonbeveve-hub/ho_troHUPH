import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';

const ROLE_LABEL = { super_admin: 'Quản trị cấp cao', admin: 'Quản lý', handler: 'Người phụ trách' };

export default function Staff() {
  const [result, setResult] = useState({ data: [], page: 1, pageSize: 30, total: 0 });
  const [departments, setDepartments] = useState([]);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', departmentId: '' });
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editStaff, setEditStaff] = useState({ name: '', email: '', phone: '', departmentId: '' });

  const [accountFormId, setAccountFormId] = useState(null);
  const [accountForm, setAccountForm] = useState({ role: 'handler', password: '' });
  const [accountError, setAccountError] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);

  const load = () => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set('q', q);
    api.get(`/admin/staff?${params.toString()}`).then(setResult);
  };

  const items = result.data;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const isSuperAdmin = me?.role === 'super_admin';

  useEffect(() => {
    api.get('/admin/departments').then(setDepartments);
    api.get('/admin/me').then(setMe).catch(() => {});
  }, []);
  useEffect(load, [q, page]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!newStaff.name.trim()) return;
    try {
      await api.post('/admin/staff', {
        name: newStaff.name.trim(),
        email: newStaff.email.trim() || null,
        phone: newStaff.phone.trim() || null,
        departmentId: newStaff.departmentId || null,
      });
      setNewStaff({ name: '', email: '', phone: '', departmentId: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditStaff({
      name: s.name,
      email: s.email || '',
      phone: s.phone || '',
      departmentId: s.department_id ? String(s.department_id) : '',
    });
    setError('');
  };

  const saveEdit = async (id) => {
    setError('');
    if (!editStaff.name.trim()) return;
    try {
      await api.patch(`/admin/staff/${id}`, {
        name: editStaff.name.trim(),
        email: editStaff.email.trim() || null,
        phone: editStaff.phone.trim() || null,
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

  const openAccountForm = (staffId, currentRole) => {
    setAccountFormId(staffId);
    setAccountForm({ role: currentRole || 'handler', password: '' });
    setAccountError('');
  };

  const handleGrantAccount = async (staffId) => {
    setAccountError('');
    if (!accountForm.password || accountForm.password.length < 8) {
      setAccountError('Mật khẩu cần ít nhất 8 ký tự.');
      return;
    }
    setAccountSaving(true);
    try {
      await api.post(`/admin/staff/${staffId}/grant-account`, accountForm);
      setAccountFormId(null);
      load();
    } catch (err) {
      setAccountError(err.message);
    } finally {
      setAccountSaving(false);
    }
  };

  const handleUpdateAccount = async (staffId, patch) => {
    setAccountError('');
    setAccountSaving(true);
    try {
      await api.patch(`/admin/staff/${staffId}/account`, patch);
      setAccountFormId(null);
      load();
    } catch (err) {
      setAccountError(err.message);
    } finally {
      setAccountSaving(false);
    }
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

      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
        <input
          value={newStaff.phone}
          onChange={(e) => setNewStaff((s) => ({ ...s, phone: e.target.value }))}
          placeholder="Số điện thoại"
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
        <button className="col-span-2 sm:col-span-4 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30">
          Thêm nhân sự
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Tìm theo tên..."
        className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm mb-4"
      />
      <p className="text-xs text-slate-400 mb-2">{result.total} nhân sự</p>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((s) => (
          <div key={s.id} className="px-4 py-3">
            {editingId === s.id ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                <input
                  value={editStaff.phone}
                  onChange={(e) => setEditStaff((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Số điện thoại"
                  className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                />
                <select
                  value={editStaff.departmentId}
                  onChange={(e) => setEditStaff((f) => ({ ...f, departmentId: e.target.value }))}
                  className="col-span-2 sm:col-span-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                >
                  <option value="">-- Đơn vị --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <div className="col-span-2 sm:col-span-3 flex gap-2">
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
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {s.email || 'chưa có email'} {s.phone ? `· ${s.phone}` : ''} ·{' '}
                      {s.department_name || 'chưa rõ đơn vị'}
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

                {isSuperAdmin && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    {s.account_role ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-medium ${
                            s.account_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          Tài khoản: {ROLE_LABEL[s.account_role] || s.account_role} ·{' '}
                          {s.account_status === 'active' ? 'Đang hoạt động' : 'Đã khoá'}
                        </span>
                        <button
                          onClick={() => openAccountForm(s.id, s.account_role)}
                          className="text-brand-600 hover:underline"
                        >
                          Sửa tài khoản
                        </button>
                        {s.account_status === 'active' ? (
                          <button
                            onClick={() => handleUpdateAccount(s.id, { status: 'disabled' })}
                            disabled={accountSaving}
                            className="text-red-500 hover:underline"
                          >
                            Khoá
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateAccount(s.id, { status: 'active' })}
                            disabled={accountSaving}
                            className="text-emerald-600 hover:underline"
                          >
                            Mở khoá
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openAccountForm(s.id, 'handler')}
                        disabled={!s.email}
                        className="text-xs text-brand-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!s.email ? 'Cần có email trước khi cấp tài khoản' : ''}
                      >
                        + Cấp tài khoản đăng nhập
                      </button>
                    )}

                    {accountFormId === s.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                        <select
                          value={accountForm.role}
                          onChange={(e) => setAccountForm((f) => ({ ...f, role: e.target.value }))}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="handler">Người phụ trách</option>
                          <option value="admin">Quản lý</option>
                          <option value="super_admin">Quản trị cấp cao</option>
                        </select>
                        <input
                          type="password"
                          value={accountForm.password}
                          onChange={(e) => setAccountForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder={s.account_role ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu (tối thiểu 8 ký tự)'}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs flex-1 min-w-[160px]"
                        />
                        <button
                          onClick={() =>
                            s.account_role
                              ? handleUpdateAccount(s.id, {
                                  role: accountForm.role,
                                  password: accountForm.password || undefined,
                                })
                              : handleGrantAccount(s.id)
                          }
                          disabled={accountSaving}
                          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {accountSaving ? 'Đang lưu...' : s.account_role ? 'Cập nhật' : 'Cấp tài khoản'}
                        </button>
                        <button
                          onClick={() => setAccountFormId(null)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                        >
                          Huỷ
                        </button>
                        {accountError && <p className="w-full text-xs text-red-600">{accountError}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Chưa có nhân sự nào.</p>}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm text-slate-500">
            Trang {page}/{totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {showImport && (
        <ExcelImportModal
          title="Import danh sách nhân sự"
          importPath="/admin/staff/import"
          hint="File Excel cần cột 'Họ tên', 'Email', 'Số điện thoại', 'Khoa/phòng/đơn vị'."
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
