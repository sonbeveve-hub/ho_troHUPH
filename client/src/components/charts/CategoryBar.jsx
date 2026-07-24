import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const BRAND = '#6C5CE7';

export default function CategoryBar({ data, color = BRAND }) {
  const rows = data.filter((d) => d.label).slice(0, 8);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">Chưa có dữ liệu.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#EEF0F5" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fontSize: 12, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: '#F8F7FF' }}
          contentStyle={{ borderRadius: 8, border: '1px solid #EEF0F5', fontSize: 12 }}
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
