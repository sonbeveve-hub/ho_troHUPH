import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const ROLE_LABEL = { super_admin: 'Quản trị cấp cao', admin: 'Quản lý', handler: 'Người phụ trách' };

export default function Assignees() {
  const [items, setItems] = useState([]);
  const [me, setMe] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [accountFormId, setAccountFormId] = useState(null);
  const [accountForm, setAccountForm] = useState({ role: 'handler', password: '' });
  const [accountError, setAccountError] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);

  const isSuperAdmin = me?.role === 'super_admin';

  const load = () => {
    api.get('/admin/assignees').then(setItems);
  };
  useEffect(load, []);
  useEffect(() => {
    api.get('/admin/me').then(setMe).catch(() => {});
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/assignees', { name: name.trim(), email: email.trim(), phone: phone.trim() || null });
      setName('');
      setEmail('');
      setPhone('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, email: item.email, phone: item.phone || '' });
    setError('');
  };

  const saveEdit = async (id) => {
    setError('');
    try {
      await api.patch(`/admin/assignees/${id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (item) => {
    await api.patch(`/admin/assignees/${item.id}`, { active: item.active ? 0 : 1 });
    load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Xoá "${item.name}" khỏi danh sách người phụ trách?`)) return;
    await api.delete(`/admin/assignees/${item.id}`);
    load();
  };

  const openAccountForm = (assigneeId, currentRole) => {
    setAccountFormId(assigneeId);
    setAccountForm({ role: currentRole || 'handler', password: '' });
    setAccountError('');
  };

  const handleGrantAccount = async (assigneeId) => {
    setAccountError('');
    if (!accountForm.password || accountForm.password.length < 8) {
      setAccountError('Mật khẩu cần ít nhất 8 ký tự.');
      return;
    }
    setAccountSaving(true);
    try {
      await api.post(`/admin/assignees/${assigneeId}/grant-account`, accountForm);
      setAccountFormId(null);
      load();
    } catch (err) {
      setAccountError(err.message);
    } finally {
      setAccountSaving(false);
    }
  };

  const handleUpdateAccount = async (assigneeId, patch) => {
    setAccountError('');
    setAccountSaving(true);
    try {
      await api.patch(`/admin/assignees/${assigneeId}/account`, patch);
      setAccountFormId(null);
      load();
    } catch (err) {
      setAccountError(err.message);
    } finally {
      setAccountSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Người phụ trách</h1>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Họ và tên"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Số điện thoại (tuỳ chọn)"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        <button className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30">
          Thêm
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {items.length > 0 && <p className="text-xs text-slate-400 mb-2">{items.length} người</p>}

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            {editingId === item.id ? (
              <div className="space-y-2">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                  autoFocus
                />
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Số điện thoại"
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
                />
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
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={item.active ? 'text-slate-800' : 'text-slate-400 line-through'}>{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {item.email}
                      {item.phone ? ` — ${item.phone}` : ''}
                    </p>
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

                {isSuperAdmin && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    {item.account_role ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-medium ${
                            item.account_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          Tài khoản: {ROLE_LABEL[item.account_role] || item.account_role} ·{' '}
                          {item.account_status === 'active' ? 'Đang hoạt động' : 'Đã khoá'}
                        </span>
                        <button
                          onClick={() => openAccountForm(item.id, item.account_role)}
                          className="text-brand-600 hover:underline"
                        >
                          Sửa tài khoản
                        </button>
                        {item.account_status === 'active' ? (
                          <button
                            onClick={() => handleUpdateAccount(item.id, { status: 'disabled' })}
                            disabled={accountSaving}
                            className="text-red-500 hover:underline"
                          >
                            Khoá
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateAccount(item.id, { status: 'active' })}
                            disabled={accountSaving}
                            className="text-emerald-600 hover:underline"
                          >
                            Mở khoá
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openAccountForm(item.id, 'handler')}
                        disabled={!item.email}
                        className="text-xs text-brand-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!item.email ? 'Cần có email trước khi cấp tài khoản' : ''}
                      >
                        + Cấp tài khoản đăng nhập
                      </button>
                    )}

                    {accountFormId === item.id && (
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
                          placeholder={
                            item.account_role ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu (tối thiểu 8 ký tự)'
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs flex-1 min-w-[160px]"
                        />
                        <button
                          onClick={() =>
                            item.account_role
                              ? handleUpdateAccount(item.id, {
                                  role: accountForm.role,
                                  password: accountForm.password || undefined,
                                })
                              : handleGrantAccount(item.id)
                          }
                          disabled={accountSaving}
                          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {accountSaving ? 'Đang lưu...' : item.account_role ? 'Cập nhật' : 'Cấp tài khoản'}
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
        {items.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400">Chưa có người phụ trách nào.</p>
        )}
      </div>
    </div>
  );
}
