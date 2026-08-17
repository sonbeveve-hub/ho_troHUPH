import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleXmark, faFilter as faFilterIcon, faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import { api } from '../api/client.js';
import { StatusBadge, ProcessingTimeBadge, STATUS_META } from '../components/StatusBadge.jsx';
import OrganicBackdrop from '../components/OrganicBackdrop.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import PublicLogo from '../components/PublicLogo.jsx';
import PublicNav from '../components/PublicNav.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { TicketIllustration, ClockIllustration } from '../components/illustrations.jsx';

const STATUS_ORDER = {
  new: 0,
  in_progress: 1,
  resolved_pending: 2,
  reopened: 3,
  done: 4,
  done_auto: 5,
  rejected: 6,
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất trước' },
  { value: 'oldest', label: 'Cũ nhất trước' },
  { value: 'status', label: 'Theo tình trạng' },
];

export default function TrackRequest() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoConfirm = searchParams.get('confirm') === '1';
  const autoReject = searchParams.get('action') === 'reject';
  const autoRateStars = Number(searchParams.get('rate'));
  const autoRate = Number.isInteger(autoRateStars) && autoRateStars >= 1 && autoRateStars <= 5 ? autoRateStars : null;
  const [q, setQ] = useState(codeParam || '');
  const [theme, toggleTheme] = useTheme();
  const [results, setResults] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadByCode = async (code) => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const data = await api.get(`/track/${encodeURIComponent(code)}`);
      setResults([data]);
      navigate(`/tra-cuu/${data.request_code}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError('');
    setResults(null);
    setStatusFilter('');
    try {
      const rows = await api.get(`/track/search?q=${encodeURIComponent(query)}`);
      if (rows.length === 0) {
        setError('Không tìm thấy yêu cầu nào phù hợp.');
      } else {
        setResults(rows);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeParam) loadByCode(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedResults = useMemo(() => {
    if (!results) return null;
    const copy = (statusFilter ? results.filter((r) => r.status === statusFilter) : [...results]);
    if (sortBy === 'oldest') {
      copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'status') {
      copy.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    } else {
      copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return copy;
  }, [results, sortBy, statusFilter]);

  // Chỉ hiện các trạng thái THỰC SỰ có trong kết quả — tránh 1 dropdown liệt kê 7 trạng thái
  // trong khi người dùng chỉ có 2 yêu cầu với 2 trạng thái.
  const availableStatuses = useMemo(() => {
    if (!results) return [];
    return [...new Set(results.map((r) => r.status))];
  }, [results]);

  const updateResult = (updated) => {
    setResults((prev) => prev.map((r) => (r.request_code === updated.request_code ? updated : r)));
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className="min-h-screen px-4 py-10 dark:bg-ink transition-colors duration-300">
      <OrganicBackdrop />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <PublicNav />
      <div className="relative z-10 max-w-xl mx-auto">
        <div className="mb-2 text-center">
          <div className="mb-4">
            <PublicLogo theme={theme} className="h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent dark:bg-none dark:text-paper">
            Tra cứu yêu cầu hỗ trợ
          </h1>
          <p className="mt-2 text-slate-600 dark:text-ash">
            Nhập mã yêu cầu, họ tên, email hoặc khoa/phòng/đơn vị để xem tình trạng xử lý.
          </p>
        </div>

        <div className="relative h-14 mb-2 hidden sm:block" aria-hidden="true">
          <TicketIllustration
            className="absolute left-6 top-0 h-14 w-14 animate-float hover:scale-110 transition-transform"
            style={{ '--float-rot': '-6deg' }}
          />
          <ClockIllustration
            className="absolute right-6 top-0 h-14 w-14 animate-float hover:scale-110 transition-transform"
            style={{ '--float-rot': '6deg', animationDelay: '0.8s' }}
          />
        </div>

        <form
          onSubmit={handleSearch}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 sm:p-8 flex gap-2 dark:bg-ink-2/80 dark:border-white/10 dark:shadow-black/30"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã yêu cầu / Họ tên / Email / Đơn vị"
            className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-ink-3/70 dark:text-paper dark:placeholder:text-ash dark:focus:ring-volt"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2 text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 active:scale-95 transition disabled:opacity-60 dark:from-volt dark:to-mint dark:text-ink dark:shadow-volt/20"
          >
            {loading ? 'Đang tìm...' : 'Tra cứu'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300">
            {error}
          </div>
        )}

        {results && results.length > 1 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-ash">{sortedResults.length} kết quả</p>
            <div className="flex flex-wrap items-center gap-3">
              {availableStatuses.length > 1 && (
                <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-ash">
                  Trạng thái
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white/70 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-ink-3/70 dark:text-paper dark:focus:ring-volt"
                  >
                    <option value="">Tất cả</option>
                    {availableStatuses.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s]?.label || s}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-ash">
                Sắp xếp theo
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white/70 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-ink-3/70 dark:text-paper dark:focus:ring-volt"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {results && results.length > 1 && sortedResults.length === 0 && (
          <EmptyState
            icon={faFilterIcon}
            title="Không có yêu cầu nào khớp bộ lọc"
            description="Thử chọn lại trạng thái khác."
          />
        )}

        {sortedResults?.map((request) => (
          <RequestDetailCard
            key={request.request_code}
            request={request}
            onUpdate={updateResult}
            autoConfirm={autoConfirm}
            autoReject={autoReject}
            autoRate={autoRate}
          />
        ))}
      </div>
    </div>
    </div>
  );
}

function RequestDetailCard({ request, onUpdate, autoConfirm, autoReject, autoRate }) {
  const [confirming, setConfirming] = useState(false);
  const [autoConfirmed, setAutoConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rateSubmitting, setRateSubmitting] = useState(false);

  // Không hỏi sao ngay lúc xác nhận nữa — đánh giá chỉ mời SAU KHI yêu cầu đã đóng (khối CSAT
  // bên dưới), để tránh việc chọn sao rồi lỡ bấm "Chưa hài lòng" (không lưu) gây nhầm lẫn, và
  // để cả luồng xác nhận 1 chạm từ email lẫn xác nhận thủ công trên trang dùng chung 1 nơi hỏi.
  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const data = await api.post(`/track/${encodeURIComponent(request.request_code)}/confirm`, {});
      onUpdate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  // Xác nhận "1 chạm" từ link trong email (?confirm=1): tự gọi API ngay khi trang tải xong,
  // không bắt người dùng bấm lại nút. Chỉ tự bấm 1 lần — điều kiện requester_confirmed_at
  // chặn việc gọi lại sau khi đã xác nhận (kể cả khi reload lại đúng link đó).
  useEffect(() => {
    if (autoConfirm && request.status === 'resolved_pending' && !request.requester_confirmed_at) {
      setAutoConfirmed(true);
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConfirm, request.status, request.requester_confirmed_at]);

  // Mở sẵn form nhập lý do từ nút "Chưa được khắc phục" trong email (?action=reject) — không
  // tự gửi (cần người dùng nhập lý do), chỉ đỡ phải tìm nút trên trang.
  useEffect(() => {
    if (autoReject && request.status === 'resolved_pending') {
      setShowRejectForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReject, request.status]);

  const handleReject = async () => {
    if (rejectReason.trim().length < 3) {
      setError('Vui lòng cho biết lý do chưa hài lòng.');
      return;
    }
    setRejecting(true);
    setError('');
    try {
      const data = await api.post(`/track/${encodeURIComponent(request.request_code)}/reject`, {
        reason: rejectReason.trim(),
      });
      onUpdate(data);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRejecting(false);
    }
  };

  const handleRate = async (stars) => {
    setRateSubmitting(true);
    setError('');
    try {
      const data = await api.post(`/track/${encodeURIComponent(request.request_code)}/rate`, { rating: stars });
      onUpdate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRateSubmitting(false);
    }
  };

  // Đánh giá "1 chạm" từ link sao trong email nhắc đánh giá (?rate=N): tự gửi ngay khi tải
  // trang. csat_rating chặn gọi lại nếu đã đánh giá rồi (kể cả tải lại đúng link đó).
  useEffect(() => {
    if (autoRate && (request.status === 'done' || request.status === 'done_auto') && !request.csat_rating) {
      handleRate(autoRate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRate, request.status, request.csat_rating]);

  return (
    <div className="mt-5 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 sm:p-8 dark:bg-ink-2/80 dark:border-white/10 dark:shadow-black/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-ash font-mono">{request.request_code}</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-paper mt-1">{request.request_type_name}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={request.status} />
          <ProcessingTimeBadge name={request.processing_time_name} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500 dark:text-ash">Người gửi</dt>
          <dd className="text-slate-800 dark:text-paper">{request.requester_name}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-ash">Đơn vị</dt>
          <dd className="text-slate-800 dark:text-paper">{request.department_name}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-ash">Thời gian gửi</dt>
          <dd className="text-slate-800 dark:text-paper">{new Date(request.created_at).toLocaleString('vi-VN')}</dd>
        </div>
        {request.assignee_name && (
          <div>
            <dt className="text-slate-500 dark:text-ash">Người phụ trách</dt>
            <dd className="text-slate-800 dark:text-paper">{request.assignee_name}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4">
        <dt className="text-slate-500 dark:text-ash text-sm">Mô tả</dt>
        <dd className="text-slate-800 dark:text-paper mt-1 whitespace-pre-wrap">{request.description}</dd>
      </div>

      {request.status === 'resolved_pending' && request.admin_notes && (
        <div className="mt-4 rounded-2xl bg-yellow-50 border border-yellow-200 p-4 dark:bg-yellow-500/10 dark:border-yellow-500/20">
          <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Giải pháp/ghi chú từ Trung tâm</p>
          <p className="text-sm text-yellow-900 dark:text-yellow-100/90 whitespace-pre-wrap">{request.admin_notes}</p>
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-paper mb-2">Lịch sử xử lý</h3>
        <ul className="space-y-2">
          {request.history.map((h, i) => (
            <li key={i} className="text-sm flex items-start gap-3">
              <span className="text-slate-500 dark:text-ash w-36 shrink-0">
                {new Date(h.changed_at).toLocaleString('vi-VN')}
              </span>
              <span>
                <StatusBadge status={h.status} /> {h.note && <span className="text-slate-600 dark:text-ash ml-2">{h.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-slate-100 dark:border-white/10 pt-5">
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}

        {request.requester_confirmed_at || request.status === 'done_auto' ? (
          <div
            className={`rounded-xl px-4 py-3 border ${
              request.requester_confirmed_at
                ? 'bg-emerald-50 border-emerald-200 dark:bg-mint/10 dark:border-mint/20'
                : 'bg-slate-50 border-slate-200 dark:bg-ink-3/70 dark:border-white/10'
            }`}
          >
            {request.requester_confirmed_at ? (
              <p className="text-sm text-emerald-700 dark:text-mint">
                <FontAwesomeIcon icon={faCircleCheck} className="mr-1.5" />
                Đã xác nhận hỗ trợ lúc {new Date(request.requester_confirmed_at).toLocaleString('vi-VN')}.
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-ash">
                Yêu cầu đã được hệ thống tự động đóng do không nhận được phản hồi xác nhận trong thời hạn quy định.
              </p>
            )}

            {request.csat_rating ? (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span>Đánh giá của bạn:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesomeIcon key={star} icon={star <= request.csat_rating ? faStarSolid : faStarRegular} />
                ))}
              </p>
            ) : rateSubmitting ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-ash">Đang gửi đánh giá...</p>
            ) : (
              <div className="mt-2">
                <p className="text-xs text-slate-500 dark:text-ash mb-1">Bạn hài lòng với kết quả hỗ trợ này không?</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRate(star)}
                      className="text-2xl leading-none text-slate-200 dark:text-white/15 hover:text-amber-400 dark:hover:text-volt transition"
                      title={`Đánh giá ${star} sao`}
                    >
                      <FontAwesomeIcon icon={faStarSolid} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : request.status === 'reopened' ? (
          <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-300">
            Yêu cầu đã được mở lại và Trung tâm đang tiếp tục xử lý. Bạn sẽ được thông báo khi có cập nhật mới.
          </p>
        ) : autoConfirmed && confirming ? (
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 dark:bg-ink-3/70 dark:border-white/10 dark:text-ash">
            Đang xác nhận từ liên kết trong email...
          </p>
        ) : request.status === 'resolved_pending' ? (
          <div>
            <p className="text-sm text-slate-500 dark:text-ash mb-3">
              Yêu cầu của bạn đã được hỗ trợ xong? Hãy xác nhận để Trung tâm ghi nhận và đóng yêu
              cầu — sau khi xác nhận, bạn sẽ được mời đánh giá trải nghiệm hỗ trợ.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleConfirm}
                disabled={confirming || rejecting}
                className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2 text-sm text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition disabled:opacity-60 dark:from-volt dark:to-mint dark:text-ink dark:shadow-volt/20"
              >
                {confirming ? (
                  'Đang xác nhận...'
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCircleCheck} className="mr-1.5" />
                    Xác nhận hoàn thành
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRejectForm((v) => !v)}
                disabled={confirming || rejecting}
                className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700 font-semibold hover:bg-red-100 transition disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                <FontAwesomeIcon icon={faCircleXmark} className="mr-1.5" />
                Chưa hài lòng, yêu cầu xử lý lại
              </button>
            </div>

            {showRejectForm && (
              <div className="mt-3">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  placeholder="Vui lòng cho biết lý do chưa hài lòng..."
                  className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-ink-3/70 dark:text-paper dark:placeholder:text-ash"
                />
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="mt-2 rounded-full bg-red-600 px-5 py-2 text-sm text-white font-semibold hover:bg-red-700 transition disabled:opacity-60"
                >
                  {rejecting ? 'Đang gửi...' : 'Gửi phản hồi từ chối'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-ash">
            Yêu cầu sẽ có nút xác nhận sau khi Trung tâm hoàn tất xử lý.
          </p>
        )}
      </div>
    </div>
  );
}
