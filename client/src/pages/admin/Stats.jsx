import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faRobot, faStar, faClipboardList, faFileArrowDown } from '@fortawesome/free-solid-svg-icons';
import { api } from '../../api/client.js';
import StatusBreakdown from '../../components/charts/StatusBreakdown.jsx';
import CategoryBar from '../../components/charts/CategoryBar.jsx';
import TimeSeries from '../../components/charts/TimeSeries.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

const STATUS_LABEL = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  resolved_pending: 'Chờ xác nhận',
  reopened: 'Mở lại',
  done: 'Hoàn thành',
  done_auto: 'Tự động đóng',
  rejected: 'Từ chối',
};
const STATUS_DOT = {
  new: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  resolved_pending: 'bg-yellow-500',
  reopened: 'bg-orange-500',
  done: 'bg-emerald-500',
  done_auto: 'bg-slate-400',
  rejected: 'bg-red-500',
};

export default function Stats() {
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [byAssignee, setByAssignee] = useState([]);
  const [aiStats, setAiStats] = useState(null);
  const [confirmationStats, setConfirmationStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats/summary').then(setSummary).catch((err) => setError(err.message));
    api.get('/admin/stats/timeseries?days=30').then(setTimeseries).catch(() => {});
    api.get('/admin/stats/by-assignee').then(setByAssignee).catch(() => {});
    api.get('/admin/stats/ai').then(setAiStats).catch(() => {});
    api.get('/admin/stats/confirmation').then(setConfirmationStats).catch(() => {});
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">Không tải được thống kê: {error}</p>;
  }
  if (!summary) return <p className="text-slate-400 text-sm">Đang tải...</p>;

  const statusCounts = Object.fromEntries(summary.byStatus.map((s) => [s.status, s.count]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <a
          href="/api/admin/stats/export"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <FontAwesomeIcon icon={faFileArrowDown} className="mr-1.5" />
          Xuất Excel
        </a>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 via-emerald-500 to-teal-600 p-6 mb-6 shadow-xl shadow-brand-500/20">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 -left-6 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl shrink-0">
            <FontAwesomeIcon icon={faClipboardList} />
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

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Theo loại yêu cầu</h2>
          <CategoryBar data={summary.byRequestType} color="#3FAE7C" />
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Số yêu cầu theo ngày (30 ngày gần nhất)</h2>
          <TimeSeries data={timeseries} />
        </div>
      </div>

      {confirmationStats && <ConfirmationStats stats={confirmationStats} />}

      {aiStats && <AiFeedbackStats stats={aiStats} />}

      <AssigneeProgress rows={byAssignee} />
    </div>
  );
}

function ConfirmationStats({ stats }) {
  const {
    pendingCount,
    reopenedCount,
    confirmedCount,
    delegateConfirmedCount,
    autoClosedCount,
    escalatedCount,
    ratingCount,
    avgRating,
    avgConfirmWaitDays,
    ratingBreakdown,
  } = stats;
  const ratingMap = Object.fromEntries(ratingBreakdown.map((r) => [r.rating, r.count]));

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 mt-5">
      <h2 className="font-semibold text-slate-900 mb-4">
        <FontAwesomeIcon icon={faCircleCheck} className="mr-1.5" />
        Xác nhận hoàn thành &amp; Hài lòng dịch vụ (CSAT)
      </h2>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Đang chờ xác nhận" value={pendingCount} dotClass="bg-yellow-500" />
          <MiniStat label="Đã mở lại (bị từ chối)" value={reopenedCount} dotClass="bg-orange-500" />
          <MiniStat label="Người gửi tự xác nhận" value={confirmedCount} dotClass="bg-emerald-500" />
          <MiniStat label="Admin xác nhận thay" value={delegateConfirmedCount} />
          <MiniStat label="Tự động đóng (không phản hồi)" value={autoClosedCount} dotClass="bg-slate-400" />
          <MiniStat label="Cần chú ý (bị từ chối ≥ 2 lần)" value={escalatedCount} dotClass="bg-red-500" />
          <MiniStat
            label="TG chờ xác nhận TB"
            value={avgConfirmWaitDays != null ? `${avgConfirmWaitDays.toFixed(1)} ngày` : '—'}
          />
          <MiniStat
            label="Điểm hài lòng TB (CSAT)"
            value={
              avgRating ? (
                <>
                  {avgRating.toFixed(1)} <FontAwesomeIcon icon={faStar} className="text-amber-400 text-sm" />
                </>
              ) : (
                '—'
              )
            }
            sub={`${ratingCount} lượt đánh giá`}
          />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Phân bố đánh giá CSAT</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingMap[star] || 0;
              const pct = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-slate-500 shrink-0 inline-flex items-center gap-0.5">
                    {star} <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-slate-400 shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AiFeedbackStats({ stats }) {
  const { totalSuggested, resolvedCount, unresolvedCount, noFeedbackCount, ratingCount, avgRating, ratingBreakdown } =
    stats;
  const answeredCount = resolvedCount + unresolvedCount;
  const resolveRate = answeredCount > 0 ? Math.round((resolvedCount / answeredCount) * 100) : null;
  const ratingMap = Object.fromEntries(ratingBreakdown.map((r) => [r.rating, r.count]));

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 mt-5">
      <h2 className="font-semibold text-slate-900 mb-4">
        <FontAwesomeIcon icon={faRobot} className="mr-1.5" />
        Đánh giá phản hồi/hỗ trợ của Trợ lý AI hỗ trợ kỹ thuật
      </h2>

      {totalSuggested === 0 ? (
        <p className="text-sm text-slate-400">Chưa có yêu cầu nào được AI phân tích.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Đã gợi ý" value={totalSuggested} />
            <MiniStat
              label="Tỷ lệ tự khắc phục"
              value={resolveRate === null ? '—' : `${resolveRate}%`}
              sub={`${resolvedCount}/${answeredCount || 0} phản hồi`}
            />
            <MiniStat label="Đã khắc phục" value={resolvedCount} dotClass="bg-emerald-500" />
            <MiniStat label="Chưa khắc phục" value={unresolvedCount} dotClass="bg-amber-500" />
            <MiniStat label="Chưa phản hồi" value={noFeedbackCount} dotClass="bg-slate-300" />
            <MiniStat
              label="Điểm đánh giá TB"
              value={
              avgRating ? (
                <>
                  {avgRating.toFixed(1)} <FontAwesomeIcon icon={faStar} className="text-amber-400 text-sm" />
                </>
              ) : (
                '—'
              )
            }
              sub={`${ratingCount} lượt đánh giá`}
            />
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2">Phân bố đánh giá sao</p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingMap[star] || 0;
                const pct = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-slate-500 shrink-0 inline-flex items-center gap-0.5">
                    {star} <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                  </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-slate-400 shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub, dotClass }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function AssigneeProgress({ rows }) {
  const [filterEmail, setFilterEmail] = useState('');
  const [drillDown, setDrillDown] = useState([]);
  const [loadingDrillDown, setLoadingDrillDown] = useState(false);

  const filterable = rows.filter((r) => r.assignee_email);

  useEffect(() => {
    if (!filterEmail) {
      setDrillDown([]);
      return;
    }
    setLoadingDrillDown(true);
    api
      .get(`/admin/requests?assignee_email=${encodeURIComponent(filterEmail)}&page=1`)
      .then((res) => setDrillDown(res.data))
      .finally(() => setLoadingDrillDown(false));
  }, [filterEmail]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-5 mt-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold text-slate-900">Tiến độ theo người phụ trách</h2>
        {filterable.length > 0 && (
          <select
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm"
          >
            <option value="">Lọc theo người phụ trách...</option>
            {filterable.map((r) => (
              <option key={r.assignee_email} value={r.assignee_email}>
                {r.assignee_name} ({r.assignee_email})
              </option>
            ))}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-3 font-medium">Người phụ trách</th>
                <th className="py-2 px-3 font-medium text-right">Tổng</th>
                <th className="py-2 px-3 font-medium text-right">Mới</th>
                <th className="py-2 px-3 font-medium text-right">Đang xử lý</th>
                <th className="py-2 px-3 font-medium text-right">Chờ xác nhận</th>
                <th className="py-2 px-3 font-medium text-right">Mở lại</th>
                <th className="py-2 px-3 font-medium text-right">Hoàn thành</th>
                <th className="py-2 pl-3 font-medium text-right">Từ chối</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assignee_email || 'unassigned'} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-3 text-slate-800">
                    {r.assignee_name}
                    {r.assignee_email && <span className="text-slate-400 text-xs ml-1">({r.assignee_email})</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-900">{r.total}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{r.new_count}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{r.in_progress_count}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{r.resolved_pending_count}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{r.reopened_count}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{r.done_count}</td>
                  <td className="py-2 pl-3 text-right text-slate-500">{r.rejected_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filterEmail && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {loadingDrillDown ? (
            <p className="text-sm text-slate-400">Đang tải...</p>
          ) : drillDown.length === 0 ? (
            <p className="text-sm text-slate-400">Không có yêu cầu nào.</p>
          ) : (
            <div className="space-y-2">
              {drillDown.map((r) => (
                <Link
                  key={r.id}
                  to={`/admin/requests/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">
                      <span className="font-mono text-xs text-slate-400 mr-2">{r.request_code}</span>
                      {r.requester_name}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
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
