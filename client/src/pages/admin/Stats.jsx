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

  useEffect(() => {
    api.get('/admin/stats/summary').then(setSummary);
    api.get('/admin/stats/timeseries?days=30').then(setTimeseries);
  }, []);

  if (!summary) return <p className="text-slate-400 text-sm">Đang tải...</p>;

  const statusCounts = Object.fromEntries(summary.byStatus.map((s) => [s.status, s.count]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Tổng quan</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatTile label="Tổng số yêu cầu" value={summary.total} />
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
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Theo trạng thái</h2>
          <StatusBreakdown byStatus={summary.byStatus} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Theo đơn vị</h2>
          <CategoryBar data={summary.byDepartment} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Theo loại yêu cầu</h2>
          <CategoryBar data={summary.byRequestType} color="#8B7BF4" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Số yêu cầu theo ngày (30 ngày gần nhất)</h2>
          <TimeSeries data={timeseries} />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, dotClass }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value.toLocaleString('vi-VN')}</p>
    </div>
  );
}
