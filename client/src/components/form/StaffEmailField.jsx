import { useEffect, useState } from 'react';
import { useStaffLookup } from '../../hooks/useStaffLookup.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StaffEmailField({ name, departmentId, value, onChange }) {
  const { matches, loading } = useStaffLookup(name, departmentId);
  const [mode, setMode] = useState('idle'); // idle | auto | picked | manual
  const [manualEmail, setManualEmail] = useState('');

  useEffect(() => {
    if (mode === 'manual') return; // người dùng đã chủ động chuyển sang nhập tay, không tự ghi đè

    if (matches.length === 1) {
      setMode('auto');
      onChange({ email: matches[0].email || '', source: 'auto' });
    } else if (matches.length > 1) {
      setMode('picked');
      onChange({ email: '', source: 'picked' });
    } else {
      setMode('idle');
      onChange({ email: '', source: 'manual' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const switchToManual = () => {
    setMode('manual');
    setManualEmail('');
    onChange({ email: '', source: 'manual' });
  };

  if (mode === 'auto') {
    const match = matches[0];
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          readOnly
          value={value}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-700"
        />
        <p className="mt-1 text-xs text-slate-500">
          Tự động điền theo hồ sơ "{match?.name}"
          {match?.department_name ? ` — ${match.department_name}` : ''}.{' '}
          <button type="button" onClick={switchToManual} className="text-brand-600 underline">
            Không phải bạn? Nhập thủ công
          </button>
        </p>
      </div>
    );
  }

  if (mode === 'picked') {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Chọn đúng email của bạn
        </label>
        <select
          value={value}
          onChange={(e) => onChange({ email: e.target.value, source: 'picked' })}
          className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">-- Có {matches.length} người trùng tên, vui lòng chọn --</option>
          {matches.map((m) => (
            <option key={m.id} value={m.email || ''}>
              {m.name} — {m.department_name || 'Chưa rõ đơn vị'} ({m.email || 'chưa có email'})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Không thấy tên bạn?{' '}
          <button type="button" onClick={switchToManual} className="text-brand-600 underline">
            Nhập email thủ công
          </button>
        </p>
      </div>
    );
  }

  // idle hoặc manual: nhập tay
  const showValidation = manualEmail.length > 0 && !EMAIL_RE.test(manualEmail);
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
      <input
        type="email"
        placeholder="mail@huph.edu.vn"
        value={mode === 'manual' ? manualEmail : value}
        onChange={(e) => {
          setManualEmail(e.target.value);
          onChange({ email: e.target.value, source: 'manual' });
        }}
        className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      {loading && <p className="mt-1 text-xs text-slate-400">Đang tìm kiếm...</p>}
      {showValidation && <p className="mt-1 text-xs text-red-500">Email không đúng định dạng.</p>}
      {mode === 'idle' && name.trim().length >= 2 && !loading && matches.length === 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Không tìm thấy hồ sơ trùng tên, vui lòng nhập email của bạn.
        </p>
      )}
    </div>
  );
}
