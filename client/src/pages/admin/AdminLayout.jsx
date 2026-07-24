import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';

const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: OverviewIcon, end: true },
  { to: '/admin/requests', label: 'Yêu cầu', icon: TicketsIcon },
  { to: '/admin/departments', label: 'Đơn vị', icon: DeptIcon },
  { to: '/admin/request-types', label: 'Loại yêu cầu', icon: TypeIcon },
  { to: '/admin/processing-times', label: 'Thời gian xử lý', icon: ClockIcon },
  { to: '/admin/staff', label: 'Nhân sự', icon: StaffIcon },
];

export default function AdminLayout({ admin, onLoggedOut }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post('/admin/logout', {});
    onLoggedOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex">
      <aside className="w-60 shrink-0 bg-white border-r border-slate-100 flex flex-col py-6 px-4">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-sm">
            S
          </div>
          <span className="font-semibold text-slate-900">Hỗ trợ Admin</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 pt-4 mt-4 flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-semibold">
            {admin?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{admin?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="text-slate-400 hover:text-slate-700"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function OverviewIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function TicketsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
    </svg>
  );
}
function DeptIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
    </svg>
  );
}
function TypeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
function StaffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 8.5a3 3 0 1 1 4 2.83M17 14c2.8.3 4.5 1.6 4.5 3.3V20" />
    </svg>
  );
}
function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
