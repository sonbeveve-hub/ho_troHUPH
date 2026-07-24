import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import StatusBreakdown from '../../components/charts/StatusBreakdown.jsx';
import CategoryBar from '../../components/charts/CategoryBar.jsx';
import TimeSeries from '../../components/charts/TimeSeries.jsx';

const STATUS_LABEL = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  done: 'Hoàn thành',
  rejected: 'Từ chối',
};
const STATUS_DOT = {
  new: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-500',
  rejected: 'bg-red-500',
};

export default function Stats() {
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats/summary').then(setSummary).catch((err) => setError(err.message));
    api.get('/admin/stats/timeseries?days=30').then(setTimeseries).catch(() => {});
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">Không tải được thống kê: {error}</p>;
  }
  if (!summary) return <p className="text-slate-400 text-sm">Đang tải...</p>;

  const statusCounts = Object.fromEntries(summary.byStatus.map((s) => [s.status, s.count]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Tổng quan</h1>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 via-emerald-500 to-teal-600 p-6 mb-6 shadow-xl shadow-brand-500/20">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 -left-6 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl shrink-0">
            📋
          </div>
          <div>
            <p className="text-white/80 text-sm">Tổng số yêu cầu hỗ trợ</p>
            <p className="text-4xl font-bold text-white">{summary.total.toLocaleString('vi-VN')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.keys(STATUS_LABEL).map((status) => (
          <StatTile
            key={status}
            label={STATUS_LABEL[status]}
            value={statusCounts[status] || 0}
            dotClass={STATUS_DOT[status]}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Theo trạng thái</h2>
          <StatusBreakdown byStatus={summary.byStatus} />
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Theo đơn vị</h2>
          <CategoryBar data={summary.byDepartment} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Theo loại yêu cầu</h2>
          <CategoryBar data={summary.byRequestType} color="#3FAE7C" />
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Số yêu cầu theo ngày (30 ngày gần nhất)</h2>
          <TimeSeries data={timeseries} />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, dotClass }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-4">
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value.toLocaleString('vi-VN')}</p>
    </div>
  );
}
