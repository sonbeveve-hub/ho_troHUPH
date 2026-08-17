import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const BRAND = '#1B7A4D';

export default function CategoryBar({ data, color = BRAND, theme }) {
  const rows = data.filter((d) => d.label).slice(0, 8);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-ash py-8 text-center">Chưa có dữ liệu.</p>;
  }

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#2A2B30' : '#EEF0F5';
  const axisTick = isDark ? '#7C7C74' : '#94A3B8';
  const labelTick = isDark ? '#FCFCFC' : '#475569';

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={gridStroke} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: axisTick }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fontSize: 12, fill: labelTick }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: isDark ? '#1F2024' : '#F8F7FF' }}
          contentStyle={
            isDark
              ? { borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, background: '#17181B', color: '#FCFCFC' }
              : { borderRadius: 8, border: '1px solid #EEF0F5', fontSize: 12 }
          }
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
          {rows.map((r, i) => (
            <Cell key={i} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
