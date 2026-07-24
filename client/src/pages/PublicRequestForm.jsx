import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StaffEmailField from '../components/form/StaffEmailField.jsx';
import ImagePicker from '../components/form/ImagePicker.jsx';

const EMPTY_FORM = {
  requesterName: '',
  departmentId: '',
  requestTypeId: '',
  processingTimeId: '',
  description: '',
  website: '', // honeypot
};

export default function PublicRequestForm() {
  const [departments, setDepartments] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [processingTimes, setProcessingTimes] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [email, setEmail] = useState({ email: '', source: 'manual' });
  const [images, setImages] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get('/departments').then(setDepartments).catch(() => setDepartments([]));
    api.get('/request-types').then(setRequestTypes).catch(() => setRequestTypes([]));
    api.get('/processing-times').then(setProcessingTimes).catch(() => setProcessingTimes([]));
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.requesterName.trim() || form.requesterName.trim().length < 2) {
      return setError('Vui lòng nhập họ tên đầy đủ.');
    }
    if (!form.departmentId) return setError('Vui lòng chọn khoa/phòng/đơn vị.');
    if (!form.requestTypeId) return setError('Vui lòng chọn loại yêu cầu.');
    if (!form.processingTimeId) return setError('Vui lòng chọn thời gian xử lý mong muốn.');
    if (!form.description.trim() || form.description.trim().length < 5) {
      return setError('Vui lòng mô tả yêu cầu chi tiết hơn.');
    }
    if (!email.email) return setError('Vui lòng cung cấp email để nhận thông báo tiến độ.');

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('requesterName', form.requesterName.trim());
      body.append('departmentId', form.departmentId);
      body.append('requestTypeId', form.requestTypeId);
      body.append('processingTimeId', form.processingTimeId);
      body.append('description', form.description.trim());
      body.append('requesterEmail', email.email);
      body.append('emailSource', email.source);
      body.append('website', form.website);
      images.forEach((file) => body.append('images', file));

      const result = await api.post('/requests', body);
      setSuccess(result.requestCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5FA] px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Đã gửi yêu cầu thành công</h1>
          <p className="mt-2 text-slate-600">
            Mã yêu cầu của bạn là <span className="font-mono font-semibold">{success}</span>.
            Chúng tôi sẽ gửi email cập nhật tiến độ xử lý tới địa chỉ bạn đã cung cấp.
          </p>
          <button
            onClick={() => {
              setSuccess(null);
              setForm(EMPTY_FORM);
              setEmail({ email: '', source: 'manual' });
              setImages([]);
            }}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-white font-medium hover:bg-brand-600 transition"
          >
            Gửi yêu cầu khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5FA] px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <img src="/logo.svg" alt="Trung tâm Tin học" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Gửi yêu cầu hỗ trợ</h1>
          <p className="mt-1 text-slate-500">
            Điền thông tin bên dưới, không cần đăng nhập. Chúng tôi sẽ liên hệ qua email.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-5"
        >
          {/* honeypot — ẩn với người dùng thật */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={update('website')}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
            <input
              type="text"
              value={form.requesterName}
              onChange={update('requesterName')}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Khoa/phòng/đơn vị
            </label>
            <select
              value={form.departmentId}
              onChange={update('departmentId')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Chọn đơn vị --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <StaffEmailField
            name={form.requesterName}
            departmentId={form.departmentId || null}
            value={email.email}
            onChange={setEmail}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Loại yêu cầu</label>
            <select
              value={form.requestTypeId}
              onChange={update('requestTypeId')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Chọn loại yêu cầu --</option>
              {requestTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Thời gian xử lý mong muốn
            </label>
            <div className="flex flex-wrap gap-2">
              {processingTimes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, processingTimeId: String(p.id) }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    form.processingTimeId === String(p.id)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.name} ngày
                </button>
              ))}
              {processingTimes.length === 0 && (
                <p className="text-sm text-slate-400">Chưa có tuỳ chọn nào, vui lòng liên hệ quản trị viên.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả yêu cầu</label>
            <textarea
              value={form.description}
              onChange={update('description')}
              rows={4}
              placeholder="Mô tả chi tiết vấn đề hoặc yêu cầu của bạn..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <ImagePicker files={images} onChange={setImages} />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-white font-semibold hover:bg-brand-600 transition disabled:opacity-60"
          >
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
      </div>
    </div>
  );
}
