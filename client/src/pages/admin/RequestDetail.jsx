import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { StatusBadge, ProcessingTimeBadge, PriorityBadge } from '../../components/StatusBadge.jsx';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Mới tiếp nhận' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'resolved_pending', label: 'Đã xử lý - Chờ xác nhận' },
  { value: 'reopened', label: 'Mở lại' },
  { value: 'done', label: 'Hoàn thành' },
  { value: 'done_auto', label: 'Đã đóng (tự động)' },
  { value: 'rejected', label: 'Từ chối' },
];

const EMAIL_STATUS_LABEL = {
  sent: 'Đã gửi',
  failed: 'Gửi thất bại',
  skipped_no_config: 'Chưa cấu hình SMTP (bỏ qua)',
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [departments, setDepartments] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [processingTimes, setProcessingTimes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [savingPriority, setSavingPriority] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [assignForm, setAssignForm] = useState({ assigneeName: '', assigneeEmail: '', assigneePhone: '' });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignMessage, setAssignMessage] = useState('');

  const load = () => {
    api.get(`/admin/requests/${id}`).then((data) => {
      setRequest(data);
      setStatus(data.status);
    });
  };

  useEffect(load, [id]);
  useEffect(() => {
    api.get('/admin/departments').then(setDepartments);
    api.get('/admin/request-types').then(setRequestTypes);
    api.get('/admin/processing-times').then(setProcessingTimes);
    api.get('/admin/priorities').then(setPriorities);
    api.get('/admin/assignees').then(setAssignees);
  }, []);

  const handleCreateFaq = async () => {
    if (!request.admin_notes) {
      setFaqMessage('Chưa có ghi chú/giải pháp nào được lưu cho yêu cầu này để làm câu trả lời.');
      return;
    }
    if (!confirm('Tạo mục FAQ mới với câu hỏi = mô tả yêu cầu, câu trả lời = ghi chú/giải pháp gần nhất?')) {
      return;
    }
    setCreatingFaq(true);
    setFaqMessage('');
    try {
      await api.post('/admin/faq', {
        question: request.description,
        answer: request.admin_notes,
        requestTypeId: request.request_type_id,
        sourceRequestId: request.id,
      });
      setFaqMessage('Đã tạo mục FAQ mới. Xem/chỉnh sửa tại trang Cơ sở tri thức.');
    } catch (err) {
      setFaqMessage(err.message);
    } finally {
      setCreatingFaq(false);
    }
  };

  const handlePriorityChange = async (e) => {
    const priorityId = e.target.value || null;
    setSavingPriority(true);
    try {
      await api.patch(`/admin/requests/${id}/priority`, { priorityId });
      load();
    } finally {
      setSavingPriority(false);
    }
  };

  useEffect(() => {
    if (!request) return;
    setAssignForm({
      assigneeName: request.assignee_name || '',
      assigneeEmail: request.assignee_email || '',
      assigneePhone: request.assignee_phone || '',
    });
  }, [request?.id]);

  const [confirmingOnBehalf, setConfirmingOnBehalf] = useState(false);
  const [confirmOnBehalfError, setConfirmOnBehalfError] = useState('');
  const [creatingFaq, setCreatingFaq] = useState(false);
  const [faqMessage, setFaqMessage] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (status === 'resolved_pending' && !note.trim()) {
      setMessage('Vui lòng mô tả giải pháp/nguyên nhân khi đánh dấu đã xử lý.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await api.patch(`/admin/requests/${id}`, { status, note });
      setMessage(res.emailSent ? 'Đã cập nhật và gửi email cho người yêu cầu.' : 'Đã cập nhật (email chưa được gửi — kiểm tra cấu hình SMTP).');
      setNote('');
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmOnBehalf = async () => {
    const reason = window.prompt('Vui lòng ghi lý do xác nhận thay (bắt buộc):');
    if (reason === null) return; // đã huỷ
    if (!reason.trim()) {
      setConfirmOnBehalfError('Vui lòng ghi rõ lý do xác nhận thay.');
      return;
    }
    setConfirmingOnBehalf(true);
    setConfirmOnBehalfError('');
    try {
      await api.patch(`/admin/requests/${id}/confirm-on-behalf`, { reason: reason.trim() });
      load();
    } catch (err) {
      setConfirmOnBehalfError(err.message);
    } finally {
      setConfirmingOnBehalf(false);
    }
  };

  const startEdit = () => {
    setEditForm({
      requesterName: request.requester_name,
      departmentId: String(request.department_id || ''),
      requestTypeId: String(request.request_type_id || ''),
      processingTimeId: String(request.processing_time_id || ''),
      requesterEmail: request.requester_email,
      description: request.description,
    });
    setEditError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditError('');
    try {
      await api.patch(`/admin/requests/${id}/details`, editForm);
      setEditing(false);
      load();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssignSaving(true);
    setAssignError('');
    setAssignMessage('');
    try {
      const res = await api.patch(`/admin/requests/${id}/assign`, assignForm);
      setAssignMessage(
        res.sent
          ? 'Đã phân công — đã gửi email cho người yêu cầu (CC người phụ trách).'
          : 'Đã phân công — email chưa gửi được, kiểm tra cấu hình SMTP.'
      );
      load();
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Xoá yêu cầu ${request.request_code}? Hành động này không thể hoàn tác.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/requests/${id}`);
      navigate('/admin/requests', { replace: true });
    } finally {
      setDeleting(false);
    }
  };

  if (!request) return <p className="text-slate-400 text-sm">Đang tải...</p>;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 mb-4">
        ← Quay lại danh sách
      </button>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5">
        {editing ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Họ tên người gửi</label>
              <input
                value={editForm.requesterName}
                onChange={(e) => setEditForm((f) => ({ ...f, requesterName: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Đơn vị</label>
                <select
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm((f) => ({ ...f, departmentId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Loại yêu cầu</label>
                <select
                  value={editForm.requestTypeId}
                  onChange={(e) => setEditForm((f) => ({ ...f, requestTypeId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
                >
                  {requestTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Thời gian xử lý mong muốn</label>
                <select
                  value={editForm.processingTimeId}
                  onChange={(e) => setEditForm((f) => ({ ...f, processingTimeId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
                >
                  {processingTimes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ngày
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.requesterEmail}
                  onChange={(e) => setEditForm((f) => ({ ...f, requesterEmail: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mô tả</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
              >
                {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Huỷ
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{request.request_code}</p>
                <h1 className="text-xl font-bold text-slate-900 mt-1">
                  {request.requester_name} — {request.request_type_name}
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={request.status} />
                <PriorityBadge name={request.priority_name} />
                <ProcessingTimeBadge name={request.processing_time_name} />
                <button onClick={startEdit} className="text-sm text-brand-600 hover:underline">
                  Sửa
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm text-red-500 hover:underline disabled:opacity-60"
                >
                  Xoá
                </button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-400">Đơn vị</dt>
                <dd className="text-slate-800">{request.department_name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Email</dt>
                <dd className="text-slate-800">{request.requester_email}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Thời gian gửi</dt>
                <dd className="text-slate-800">{new Date(request.created_at).toLocaleString('vi-VN')}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Nguồn email</dt>
                <dd className="text-slate-800">{request.email_source}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Mức độ ưu tiên</dt>
                <dd>
                  <select
                    value={request.priority_id || ''}
                    onChange={handlePriorityChange}
                    disabled={savingPriority}
                    className="rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-sm disabled:opacity-60"
                  >
                    <option value="">-- Chưa gán --</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              {request.duplicate_of_code && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Cảnh báo trùng lặp</dt>
                  <dd className="text-amber-700">
                    ⚠ Có thể trùng với{' '}
                    <a
                      href={`/admin/requests/${request.duplicate_of_id}`}
                      className="underline font-mono hover:text-amber-900"
                    >
                      {request.duplicate_of_code}
                    </a>{' '}
                    (cùng người gửi, cùng loại yêu cầu, gửi gần đây)
                  </dd>
                </div>
              )}
              {request.assignee_name && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Người xử lý</dt>
                  <dd className="text-slate-800">
                    {request.assignee_name} — {request.assignee_email}
                    {request.assignee_phone ? ` — ${request.assignee_phone}` : ''}
                  </dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-slate-400">Xác nhận từ người gửi</dt>
                <dd className={request.requester_confirmed_at ? 'text-emerald-700' : 'text-slate-400'}>
                  {request.requester_confirmed_at
                    ? `✓ Đã xác nhận lúc ${new Date(request.requester_confirmed_at).toLocaleString('vi-VN')}${request.confirmed_by === 'delegate' ? ' (admin xác nhận thay)' : ''}`
                    : 'Chưa xác nhận'}
                  {request.csat_rating ? (
                    <span className="ml-2 text-amber-600">
                      {'★'.repeat(request.csat_rating)}{'☆'.repeat(5 - request.csat_rating)}
                    </span>
                  ) : null}
                </dd>
              </div>
              {request.reject_count > 0 && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Số lần bị từ chối</dt>
                  <dd className={request.escalated_at ? 'text-red-600 font-semibold' : 'text-orange-600'}>
                    {request.reject_count} lần
                    {request.escalated_at && ' ⚠ Cần chú ý — đã từ chối nhiều lần, nên ưu tiên xử lý'}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-4">
              <dt className="text-slate-400 text-sm flex items-center justify-between">
                <span>Mô tả</span>
                <button
                  onClick={handleCreateFaq}
                  disabled={creatingFaq}
                  className="text-xs text-brand-600 hover:underline disabled:opacity-60"
                  title="Tạo mục Cơ sở tri thức từ mô tả + giải pháp (ghi chú gần nhất) của yêu cầu này"
                >
                  {creatingFaq ? 'Đang tạo...' : '+ Tạo FAQ từ yêu cầu này'}
                </button>
              </dt>
              <dd className="text-slate-800 mt-1 whitespace-pre-wrap">{request.description}</dd>
              {faqMessage && <p className="mt-1 text-xs text-emerald-700">{faqMessage}</p>}
            </div>

            {request.ai_suggestion && (
              <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">🤖 Gợi ý từ AI</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.ai_suggestion}</p>
                {request.ai_alternative_suggestion && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Phương án khác (sau khi người gửi báo chưa khắc phục được)</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.ai_alternative_suggestion}</p>
                  </>
                )}
                <p className="text-xs text-slate-400 mt-3">
                  {request.ai_resolved === 1 && '✓ Người gửi báo đã khắc phục được'}
                  {request.ai_resolved === 0 && '⚠ Người gửi báo chưa khắc phục được'}
                  {request.ai_resolved == null && 'Chưa có phản hồi từ người gửi'}
                  {request.ai_rating ? ` · Đánh giá: ${'★'.repeat(request.ai_rating)}${'☆'.repeat(5 - request.ai_rating)}` : ''}
                </p>
              </div>
            )}
          </>
        )}

        {request.attachments?.length > 0 && (
          <div className="mt-4">
            <dt className="text-slate-400 text-sm mb-2">Ảnh đính kèm ({request.attachments.length})</dt>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {request.attachments.map((a) => (
                <a
                  key={a.id}
                  href={`/api/admin/requests/${request.id}/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-square"
                  title={a.original_name}
                >
                  <img
                    src={`/api/admin/requests/${request.id}/attachments/${a.id}`}
                    alt={a.original_name}
                    className="w-full h-full object-cover rounded-lg border border-slate-200 hover:opacity-80 transition"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleUpdate} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Cập nhật tiến độ</h2>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={
            status === 'resolved_pending'
              ? 'Mô tả giải pháp/nguyên nhân (bắt buộc) — sẽ gửi kèm email yêu cầu người gửi xác nhận...'
              : 'Ghi chú gửi kèm cho người yêu cầu (tuỳ chọn)...'
          }
          className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
        />
        {message && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu & gửi email'}
          </button>
          {request.status === 'resolved_pending' && (
            <button
              type="button"
              onClick={handleConfirmOnBehalf}
              disabled={confirmingOnBehalf}
              className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
              title="Dùng khi người gửi vắng mặt/không thể tự xác nhận — chỉ khả dụng sau khi đã gửi nhắc nhở, và cần ghi rõ lý do"
            >
              {confirmingOnBehalf ? 'Đang xác nhận...' : 'Xác nhận thay người gửi'}
            </button>
          )}
        </div>
        {confirmOnBehalfError && (
          <p className="text-sm text-red-600">{confirmOnBehalfError}</p>
        )}
      </form>

      <form onSubmit={handleAssign} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Phân công xử lý</h2>
        {assignees.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Chọn từ danh sách người phụ trách</label>
            <select
              defaultValue=""
              onChange={(e) => {
                const picked = assignees.find((a) => String(a.id) === e.target.value);
                if (picked) {
                  setAssignForm({
                    assigneeName: picked.name,
                    assigneeEmail: picked.email,
                    assigneePhone: picked.phone || '',
                  });
                }
                e.target.value = '';
              }}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn người phụ trách --</option>
              {assignees
                .filter((a) => a.active)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Họ và tên</label>
            <input
              value={assignForm.assigneeName}
              onChange={(e) => setAssignForm((f) => ({ ...f, assigneeName: e.target.value }))}
              placeholder="Người phụ trách xử lý"
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={assignForm.assigneeEmail}
              onChange={(e) => setAssignForm((f) => ({ ...f, assigneeEmail: e.target.value }))}
              placeholder="mail@huph.edu.vn"
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Số điện thoại (tuỳ chọn)</label>
          <input
            value={assignForm.assigneePhone}
            onChange={(e) => setAssignForm((f) => ({ ...f, assigneePhone: e.target.value }))}
            className="w-full sm:w-1/2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
        </div>
        {assignError && <p className="text-sm text-red-600">{assignError}</p>}
        {assignMessage && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            {assignMessage}
          </div>
        )}
        <button
          type="submit"
          disabled={assignSaving}
          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
        >
          {assignSaving ? 'Đang lưu...' : request.assignee_name ? 'Cập nhật phân công & gửi email' : 'Phân công & gửi email'}
        </button>
      </form>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">Lịch sử trạng thái</h2>
        <ul className="space-y-2">
          {request.history.map((h) => (
            <li key={h.id} className="text-sm flex items-start gap-3">
              <span className="text-slate-400 w-40 shrink-0">
                {new Date(h.changed_at).toLocaleString('vi-VN')}
              </span>
              <span>
                <StatusBadge status={h.status} /> {h.note && <span className="text-slate-600 ml-2">{h.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6">
        <h2 className="font-semibold text-slate-900 mb-3">Nhật ký email</h2>
        {request.emailLog.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có email nào được gửi.</p>
        ) : (
          <ul className="space-y-2">
            {request.emailLog.map((e) => (
              <li key={e.id} className="text-sm flex items-start gap-3">
                <span className="text-slate-400 w-40 shrink-0">
                  {new Date(e.created_at).toLocaleString('vi-VN')}
                </span>
                <span className="text-slate-700">
                  {e.subject} — <span className="text-slate-500">{EMAIL_STATUS_LABEL[e.status] || e.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
