import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const STATUS_ORDER = ['new', 'in_progress', 'done', 'rejected'];
const STATUS_COLOR = {
  new: '#3B82F6',
  in_progress: '#F59E0B',
  done: '#10B981',
  rejected: '#EF4444',
};
const STATUS_LABEL = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  done: 'Hoàn thành',
  rejected: 'Từ chối',
};

export default function StatusBreakdown({ byStatus }) {
  const counts = Object.fromEntries(byStatus.map((s) => [s.status, s.count]));
  const rows = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    count: counts[status] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#EEF0F5" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fontSize: 12, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#F8F7FF' }}
          contentStyle={{ borderRadius: 8, border: '1px solid #EEF0F5', fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
          {rows.map((r) => (
            <Cell key={r.status} fill={STATUS_COLOR[r.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
