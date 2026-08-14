import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client.js';
import StaffEmailField from '../components/form/StaffEmailField.jsx';
import ImagePicker from '../components/form/ImagePicker.jsx';
import OrganicBackdrop from '../components/OrganicBackdrop.jsx';
import ChatWidget from '../components/ChatWidget.jsx';
import { FILE_TIME } from '../utils/cacheBust.js';

// eslint-disable-next-line no-undef
const APP_VERSION = __APP_VERSION__;

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
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    api.get('/departments').then(setDepartments).catch(() => setDepartments([]));
    api.get('/request-types').then(setRequestTypes).catch(() => setRequestTypes([]));
    api.get('/processing-times').then(setProcessingTimes).catch(() => setProcessingTimes([]));
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleEmailChange = (payload) => {
    setEmail(payload);
    setForm((f) => ({
      ...f,
      ...(payload.departmentId ? { departmentId: String(payload.departmentId) } : {}),
      ...(payload.name ? { requesterName: payload.name } : {}),
    }));
  };

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
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <OrganicBackdrop />
        <div className="relative z-10 max-w-md w-full flex flex-col items-center gap-4">
          <div className="w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-brand-500/30">
              <FontAwesomeIcon icon={faCheck} />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Đã gửi yêu cầu thành công</h1>
            <p className="mt-2 text-slate-600">
              Mã yêu cầu của thầy/cô là <span className="font-mono font-semibold">{success}</span>.
              TTTH sẽ gửi email cập nhật tiến độ xử lý tới địa chỉ thầy/cô đã cung cấp.
            </p>
            <button
              onClick={() => {
                setSuccess(null);
                setForm(EMPTY_FORM);
                setEmail({ email: '', source: 'manual' });
                setImages([]);
                setShowChat(true);
              }}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-2.5 text-white font-medium shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition"
            >
              Gửi yêu cầu khác <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
            </button>
            <p className="mt-4">
              <Link to={`/tra-cuu/${success}`} className="text-sm text-brand-600 hover:underline">
                Xem tình trạng xử lý
              </Link>
            </p>
          </div>
          {showChat && <ChatWidget requestCode={success} onClose={() => setShowChat(false)} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <OrganicBackdrop />
      <div className="relative z-10 max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <img src={`/logo.svg?filetime=${FILE_TIME}`} alt="Trung tâm Tin học" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            Cổng tiếp nhận hỗ trợ IT
          </h1>
          <p className="mt-2 text-slate-700 font-medium">
            Kênh tiếp nhận hỗ trợ kỹ thuật dành riêng cho Cán bộ và Giảng viên. Thầy/Cô vui lòng
            cung cấp thông tin bên dưới (không cần đăng nhập), Trung tâm sẽ xử lý và phản hồi trực
            tiếp qua email.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 sm:p-8 space-y-5"
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
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Khoa/phòng/đơn vị
            </label>
            <select
              value={form.departmentId}
              onChange={update('departmentId')}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">-- Chọn đơn vị --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <StaffEmailField name={form.requesterName} value={email.email} onChange={handleEmailChange} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Loại yêu cầu</label>
            <select
              value={form.requestTypeId}
              onChange={update('requestTypeId')}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
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
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    form.processingTimeId === String(p.id)
                      ? 'border-transparent bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-md shadow-brand-500/30'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
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
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <ImagePicker files={images} onChange={setImages} />

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2.5 text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition disabled:opacity-60"
          >
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'} {!submitting && <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-700 font-medium">
          Đã gửi yêu cầu trước đó?{' '}
          <Link to="/tra-cuu" className="text-brand-700 font-semibold hover:underline">
            Tra cứu tình trạng xử lý
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-700 font-medium">
          <Link to="/faq" className="text-brand-700 font-semibold hover:underline">
            Xem câu hỏi thường gặp
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">Phiên bản v{APP_VERSION}</p>
      </div>
    </div>
  );
}
