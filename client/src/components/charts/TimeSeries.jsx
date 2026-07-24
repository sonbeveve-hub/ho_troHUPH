import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const BRAND = '#1B7A4D';

export default function TimeSeries({ data }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">Chưa có dữ liệu.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="tsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.1} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EEF0F5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(d) => d.slice(5)}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #EEF0F5', fontSize: 12 }}
          labelFormatter={(d) => `Ngày ${d}`}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#tsFill)"
          dot={false}
          activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
