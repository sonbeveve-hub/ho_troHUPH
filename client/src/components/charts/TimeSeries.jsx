import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const BRAND = '#1B7A4D';

export default function TimeSeries({ data, theme }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-ash py-8 text-center">Chưa có dữ liệu.</p>;
  }

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#2A2B30' : '#EEF0F5';
  const axisTick = isDark ? '#7C7C74' : '#94A3B8';

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="tsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.1} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: axisTick }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(d) => d.slice(5)}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: axisTick }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={
            isDark
              ? { borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, background: '#17181B', color: '#FCFCFC' }
              : { borderRadius: 8, border: '1px solid #EEF0F5', fontSize: 12 }
          }
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
