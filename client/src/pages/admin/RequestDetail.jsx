import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faTriangleExclamation,
  faRobot,
  faArrowLeft,
  faStar as faStarSolid,
  faInbox,
  faUserGear,
  faHourglassHalf,
  faCircleXmark,
  faRotateLeft,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import { api } from '../../api/client.js';
import { StatusBadge, ProcessingTimeBadge, PriorityBadge, PRIORITY_META } from '../../components/StatusBadge.jsx';

function StarRow({ rating, max = 5 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <FontAwesomeIcon key={i} icon={i < rating ? faStarSolid : faStarRegular} />
      ))}
    </span>
  );
}

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

const AUDIT_ACTION_LABEL = {
  status_change: 'Đổi trạng thái',
  confirm_on_behalf: 'Xác nhận thay',
  edit_info: 'Sửa thông tin',
  assign: 'Phân công',
  priority_change: 'Đổi mức độ ưu tiên',
  delete: 'Xoá yêu cầu',
};

// 4 bước chính của quy trình xử lý. "reopened" thuộc bước "Đang xử lý" (quay lại xử lý sau khi
// người gửi báo chưa khắc phục được); "rejected" nằm ngoài quy trình nên không có bước riêng —
// hiển thị bằng banner thay cho thanh bước.
const STEP_DEFS = [
  { key: 'new', label: 'Tiếp nhận', icon: faInbox },
  { key: 'in_progress', label: 'Đang xử lý', icon: faUserGear },
  { key: 'resolved_pending', label: 'Chờ xác nhận', icon: faHourglassHalf },
  { key: 'done', label: 'Hoàn thành', icon: faCircleCheck },
];

function getStepIndex(status) {
  if (status === 'new') return 0;
  if (status === 'in_progress' || status === 'reopened') return 1;
  if (status === 'resolved_pending') return 2;
  if (status === 'done' || status === 'done_auto') return 3;
  return -1;
}

function RequestStepper({ status }) {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 mb-5">
        <FontAwesomeIcon icon={faCircleXmark} className="text-red-500 text-xl shrink-0" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Yêu cầu đã bị từ chối</p>
          <p className="text-xs text-red-500">Nằm ngoài quy trình xử lý thông thường.</p>
        </div>
      </div>
    );
  }

  const current = getStepIndex(status);

  return (
    <div className="mb-5">
      <div className="flex items-start">
        {STEP_DEFS.map((step, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          return (
            <div key={step.key} className={`flex items-center ${i < STEP_DEFS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm transition ${
                    isDone
                      ? 'bg-brand-500 text-white'
                      : isCurrent
                        ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-100'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <FontAwesomeIcon icon={isDone ? faCircleCheck : step.icon} />
                </div>
                <span
                  className={`text-[11px] font-medium text-center leading-tight ${
                    isCurrent ? 'text-brand-700' : isDone ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEP_DEFS.length - 1 && (
                <div className={`h-0.5 flex-1 -mt-5 rounded ${isDone ? 'bg-brand-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      {status === 'reopened' && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
          <FontAwesomeIcon icon={faRotateLeft} />
          Người gửi báo chưa khắc phục được — yêu cầu đã mở lại
        </div>
      )}
      {status === 'done_auto' && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
          Tự động đóng do người gửi không phản hồi trong thời hạn
        </div>
      )}
    </div>
  );
}

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
  const [showReassignForm, setShowReassignForm] = useState(false);

  const [stepNote, setStepNote] = useState('');
  const [stepSaving, setStepSaving] = useState(false);
  const [stepMessage, setStepMessage] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);

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
    const priority = e.target.value;
    setSavingPriority(true);
    try {
      await api.patch(`/admin/requests/${id}/priority`, { priority });
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
    setShowReassignForm(false);
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
      setMessage(
        res.emailSent
          ? 'Đã cập nhật và gửi email cho người yêu cầu.'
          : res.emailReason === 'unchanged'
            ? 'Đã lưu ghi chú (trạng thái không đổi nên không gửi email).'
            : 'Đã cập nhật (email chưa được gửi — kiểm tra cấu hình SMTP).'
      );
      setNote('');
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Hành động nhanh gắn với đúng bước hiện tại (vd: "Đánh dấu đã xử lý"), tách state (stepNote/
  // stepMessage) riêng khỏi form "Thao tác khác" bên dưới để 2 khu vực không tranh nội dung ghi chú.
  const quickUpdate = async (newStatus, requireNote) => {
    if (requireNote && !stepNote.trim()) {
      setStepMessage('Vui lòng mô tả giải pháp/nguyên nhân.');
      return;
    }
    setStepSaving(true);
    setStepMessage('');
    try {
      const res = await api.patch(`/admin/requests/${id}`, { status: newStatus, note: stepNote });
      setStepMessage(
        res.emailSent
          ? 'Đã cập nhật và gửi email cho người yêu cầu.'
          : res.emailReason === 'unchanged'
            ? 'Đã lưu ghi chú.'
            : 'Đã cập nhật (email chưa được gửi — kiểm tra cấu hình SMTP).'
      );
      setStepNote('');
      setStatus(newStatus);
      load();
    } catch (err) {
      setStepMessage(err.message);
    } finally {
      setStepSaving(false);
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
      setShowReassignForm(false);
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

  const stepIndex = getStepIndex(request.status);
  const assigneePicker = assignees.length > 0 && (
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
  );

  const assignFormBlock = (
    <form onSubmit={handleAssign} className="space-y-3">
      {assigneePicker}
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
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={assignSaving}
          className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
        >
          {assignSaving ? 'Đang lưu...' : request.assignee_name ? 'Cập nhật phân công & gửi email' : 'Phân công & gửi email'}
        </button>
        {stepIndex !== 0 && (
          <button
            type="button"
            onClick={() => setShowReassignForm(false)}
            className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Huỷ
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 mb-4">
        <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5" />
        Quay lại danh sách
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
                <PriorityBadge priority={request.priority} />
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
                    value={request.priority}
                    onChange={handlePriorityChange}
                    disabled={savingPriority}
                    className="rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-sm disabled:opacity-60"
                  >
                    {Object.entries(PRIORITY_META).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              {request.duplicate_of_code && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Cảnh báo trùng lặp</dt>
                  <dd className="text-amber-700">
                    <FontAwesomeIcon icon={faTriangleExclamation} /> Có thể trùng với{' '}
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
                  <dt className="text-slate-400 flex items-center justify-between">
                    <span>Người xử lý</span>
                    {!showReassignForm && stepIndex !== 0 && stepIndex !== -1 && (
                      <button
                        type="button"
                        onClick={() => setShowReassignForm(true)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Đổi
                      </button>
                    )}
                  </dt>
                  {showReassignForm ? (
                    <dd className="mt-2 rounded-2xl bg-slate-50 border border-slate-100 p-3">{assignFormBlock}</dd>
                  ) : (
                    <dd className="text-slate-800">
                      {request.assignee_name} — {request.assignee_email}
                      {request.assignee_phone ? ` — ${request.assignee_phone}` : ''}
                    </dd>
                  )}
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-slate-400">Xác nhận từ người gửi</dt>
                <dd className={request.requester_confirmed_at ? 'text-emerald-700' : 'text-slate-400'}>
                  {request.requester_confirmed_at ? (
                    <>
                      <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
                      Đã xác nhận lúc {new Date(request.requester_confirmed_at).toLocaleString('vi-VN')}
                      {request.confirmed_by === 'delegate' ? ' (admin xác nhận thay)' : ''}
                    </>
                  ) : (
                    'Chưa xác nhận'
                  )}
                  {request.csat_rating ? (
                    <span className="ml-2 text-amber-600">
                      <StarRow rating={request.csat_rating} />
                    </span>
                  ) : null}
                </dd>
              </div>
              {request.reject_count > 0 && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Số lần bị từ chối</dt>
                  <dd className={request.escalated_at ? 'text-red-600 font-semibold' : 'text-orange-600'}>
                    {request.reject_count} lần
                    {request.escalated_at && (
                      <>
                        {' '}
                        <FontAwesomeIcon icon={faTriangleExclamation} /> Cần chú ý — đã từ chối nhiều lần, nên ưu tiên xử lý
                      </>
                    )}
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
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  <FontAwesomeIcon icon={faRobot} className="mr-1" /> Gợi ý từ AI
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.ai_suggestion}</p>
                {request.ai_alternative_suggestion && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 mt-3 mb-1">Phương án khác (sau khi người gửi báo chưa khắc phục được)</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.ai_alternative_suggestion}</p>
                  </>
                )}
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                  {request.ai_resolved === 1 && (
                    <>
                      <FontAwesomeIcon icon={faCircleCheck} /> Người gửi báo đã khắc phục được
                    </>
                  )}
                  {request.ai_resolved === 0 && (
                    <>
                      <FontAwesomeIcon icon={faTriangleExclamation} /> Người gửi báo chưa khắc phục được
                    </>
                  )}
                  {request.ai_resolved == null && 'Chưa có phản hồi từ người gửi'}
                  {request.ai_rating ? (
                    <>
                      <span>· Đánh giá:</span>
                      <StarRow rating={request.ai_rating} />
                    </>
                  ) : (
                    ''
                  )}
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

      <RequestStepper status={request.status} />

      {/* Bước 1: Tiếp nhận — hành động chính là phân công người xử lý */}
      {stepIndex === 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5">
          <h2 className="font-semibold text-slate-900 mb-1">Bước tiếp theo: Phân công xử lý</h2>
          <p className="text-xs text-slate-400 mb-4">
            Chọn người phụ trách để bắt đầu xử lý — hệ thống tự chuyển sang &quot;Đang xử lý&quot; và gửi 1 email duy nhất.
          </p>
          {assignFormBlock}
        </div>
      )}

      {/* Bước 2: Đang xử lý — hành động chính là đánh dấu đã xử lý xong (chuyển sang chờ xác nhận) */}
      {stepIndex === 1 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Bước tiếp theo: Cập nhật tiến độ</h2>
          <p className="text-xs text-slate-400">
            Đánh dấu đã xử lý khi có giải pháp — email chờ xác nhận sẽ được gửi cho người yêu cầu. Hoặc chỉ lưu ghi chú tiến độ nếu chưa xong.
          </p>
          <textarea
            value={stepNote}
            onChange={(e) => setStepNote(e.target.value)}
            rows={3}
            placeholder="Mô tả giải pháp/nguyên nhân hoặc ghi chú tiến độ..."
            className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          />
          {stepMessage && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              {stepMessage}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => quickUpdate('resolved_pending', true)}
              disabled={stepSaving}
              className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
            >
              {stepSaving ? 'Đang lưu...' : 'Đánh dấu đã xử lý — chờ xác nhận'}
            </button>
            <button
              type="button"
              onClick={() => quickUpdate(request.status, false)}
              disabled={stepSaving}
              className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Lưu ghi chú (chưa xong)
            </button>
          </div>
        </div>
      )}

      {/* Bước 3: Chờ xác nhận — hành động chính là chờ hoặc xác nhận thay khi cần */}
      {stepIndex === 2 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5 space-y-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FontAwesomeIcon icon={faHourglassHalf} className="text-amber-500" />
            Đang chờ người gửi xác nhận
          </h2>
          <p className="text-xs text-slate-400">
            Hệ thống sẽ tự nhắc nhở và tự đóng nếu người gửi không phản hồi trong thời hạn. Chỉ dùng &quot;Xác nhận thay&quot; khi
            người gửi vắng mặt hoặc không thể tự thao tác — cần ghi rõ lý do.
          </p>
          {confirmOnBehalfError && <p className="text-sm text-red-600">{confirmOnBehalfError}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConfirmOnBehalf}
              disabled={confirmingOnBehalf}
              className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
            >
              {confirmingOnBehalf ? 'Đang xác nhận...' : 'Xác nhận thay người gửi'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Chuyển lại yêu cầu về trạng thái "Đang xử lý"?')) quickUpdate('in_progress', false);
              }}
              disabled={stepSaving}
              className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Quay lại đang xử lý
            </button>
          </div>
          {stepMessage && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              {stepMessage}
            </div>
          )}
        </div>
      )}

      {/* Bước 4: Hoàn thành — chỉ hiển thị tổng kết, không cần hành động thêm */}
      {stepIndex === 3 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
            <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500" />
            Yêu cầu đã hoàn thành
          </h2>
          <p className="text-xs text-slate-400">
            {request.csat_rating
              ? 'Người gửi đã đánh giá trải nghiệm hỗ trợ — xem điểm ở mục "Xác nhận từ người gửi" phía trên.'
              : 'Người gửi chưa gửi đánh giá trải nghiệm hỗ trợ (không bắt buộc).'}
          </p>
        </div>
      )}

      <div className="mb-5">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5"
        >
          <FontAwesomeIcon icon={showAdvanced ? faChevronUp : faChevronDown} className="text-xs" />
          Thao tác khác (đổi trạng thái thủ công)
        </button>
        {showAdvanced && (
          <form
            onSubmit={handleUpdate}
            className="mt-3 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 space-y-3"
          >
            <p className="text-xs text-slate-400">
              Dùng khi cần bỏ qua quy trình chuẩn — vd. từ chối yêu cầu, ép chuyển trạng thái, mở lại thủ công.
            </p>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm"
              >
                {/* Khi còn "Mới tiếp nhận", bỏ tuỳ chọn "Đang xử lý" khỏi đây — dùng form "Phân
                    công xử lý" ở bước 1 để chuyển sang Đang xử lý, tránh 2 form cùng gửi 2 email
                    riêng cho cùng 1 hành động "bắt đầu xử lý". */}
                {STATUS_OPTIONS.filter((s) => !(request.status === 'new' && s.value === 'in_progress')).map((s) => (
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
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/20 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu & gửi email'}
            </button>
          </form>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">Lịch sử trạng thái</h2>
        <p className="text-xs text-slate-400 mb-3">Hiển thị cho người gửi xem tại trang tra cứu.</p>
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

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">Lịch sử thao tác</h2>
        <p className="text-xs text-slate-400 mb-3">Nhật ký nội bộ (audit log) — ai thao tác gì, khi nào. Chỉ admin xem được.</p>
        {(!request.auditLog || request.auditLog.length === 0) ? (
          <p className="text-sm text-slate-400">Chưa có thao tác nào được ghi nhận.</p>
        ) : (
          <ul className="space-y-2">
            {request.auditLog.map((a) => (
              <li key={a.id} className="text-sm flex items-start gap-3">
                <span className="text-slate-400 w-40 shrink-0">
                  {new Date(a.created_at).toLocaleString('vi-VN')}
                </span>
                <span className="text-slate-700">
                  <span className="font-medium">{a.actor_name || a.actor_username || 'Hệ thống'}</span>
                  {' — '}
                  {AUDIT_ACTION_LABEL[a.action] || a.action}
                  {a.field_name && <span className="text-slate-400"> ({a.field_name})</span>}
                  {(a.old_value || a.new_value) && (
                    <span className="text-slate-500">
                      {': '}
                      {a.old_value || '—'} → {a.new_value || '—'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
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
