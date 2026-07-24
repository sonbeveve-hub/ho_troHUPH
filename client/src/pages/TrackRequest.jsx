import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { StatusBadge, ProcessingTimeBadge } from '../components/StatusBadge.jsx';
import OrganicBackdrop from '../components/OrganicBackdrop.jsx';
import { FILE_TIME } from '../utils/cacheBust.js';

export default function TrackRequest() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(codeParam || '');
  const [results, setResults] = useState(null);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadByCode = async (code) => {
    setLoading(true);
    setError('');
    setResults(null);
    setRequest(null);
    try {
      const data = await api.get(`/track/${encodeURIComponent(code)}`);
      setRequest(data);
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
    setRequest(null);
    try {
      const rows = await api.get(`/track/search?q=${encodeURIComponent(query)}`);
      if (rows.length === 0) {
        setError('Không tìm thấy yêu cầu nào phù hợp.');
      } else if (rows.length === 1) {
        await loadByCode(rows[0].request_code);
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

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const data = await api.post(`/track/${encodeURIComponent(request.request_code)}/confirm`, {});
      setRequest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <OrganicBackdrop />
      <div className="relative z-10 max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <img src={`/logo.svg?filetime=${FILE_TIME}`} alt="Trung tâm Tin học" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            Tra cứu yêu cầu hỗ trợ
          </h1>
          <p className="mt-2 text-slate-700 font-medium">
            Nhập mã yêu cầu, họ tên, email hoặc khoa/phòng/đơn vị để xem tình trạng xử lý.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 sm:p-8 flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã yêu cầu / Họ tên / Email / Đơn vị"
            className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2 text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition disabled:opacity-60"
          >
            {loading ? 'Đang tìm...' : 'Tra cứu'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-5 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 divide-y divide-slate-100">
            <p className="px-4 pt-4 text-xs text-slate-400">{results.length} kết quả — chọn 1 yêu cầu để xem chi tiết</p>
            {results.map((r) => (
              <button
                key={r.request_code}
                onClick={() => loadByCode(r.request_code)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.requester_name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      <span className="font-mono">{r.request_code}</span> · {r.department_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {request && (
          <div className="mt-5 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 font-mono">{request.request_code}</p>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{request.request_type_name}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={request.status} />
                <ProcessingTimeBadge name={request.processing_time_name} />
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-400">Người gửi</dt>
                <dd className="text-slate-800">{request.requester_name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Đơn vị</dt>
                <dd className="text-slate-800">{request.department_name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Thời gian gửi</dt>
                <dd className="text-slate-800">{new Date(request.created_at).toLocaleString('vi-VN')}</dd>
              </div>
              {request.assignee_name && (
                <div>
                  <dt className="text-slate-400">Người phụ trách</dt>
                  <dd className="text-slate-800">{request.assignee_name}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4">
              <dt className="text-slate-400 text-sm">Mô tả</dt>
              <dd className="text-slate-800 mt-1 whitespace-pre-wrap">{request.description}</dd>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Lịch sử xử lý</h3>
              <ul className="space-y-2">
                {request.history.map((h, i) => (
                  <li key={i} className="text-sm flex items-start gap-3">
                    <span className="text-slate-400 w-36 shrink-0">
                      {new Date(h.changed_at).toLocaleString('vi-VN')}
                    </span>
                    <span>
                      <StatusBadge status={h.status} /> {h.note && <span className="text-slate-600 ml-2">{h.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              {request.requester_confirmed_at ? (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  ✓ Đã xác nhận hỗ trợ lúc {new Date(request.requester_confirmed_at).toLocaleString('vi-VN')}.
                </p>
              ) : (
                <div>
                  <p className="text-sm text-slate-500 mb-2">
                    Yêu cầu của bạn đã được hỗ trợ xong? Hãy xác nhận để Trung tâm ghi nhận.
                  </p>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2 text-sm text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 transition disabled:opacity-60"
                  >
                    {confirming ? 'Đang xác nhận...' : 'Xác nhận đã được hỗ trợ'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
