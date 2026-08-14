import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import OrganicBackdrop from '../../components/OrganicBackdrop.jsx';
import { FILE_TIME } from '../../utils/cacheBust.js';

const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: OverviewIcon, end: true },
  { to: '/admin/requests', label: 'Yêu cầu', icon: TicketsIcon },
  { to: '/admin/departments', label: 'Đơn vị', icon: DeptIcon },
  { to: '/admin/request-types', label: 'Loại yêu cầu', icon: TypeIcon },
  { to: '/admin/processing-times', label: 'Thời gian xử lý', icon: ClockIcon },
  { to: '/admin/sla-rules', label: 'Quy tắc SLA', icon: SlaIcon },
  { to: '/admin/holidays', label: 'Ngày nghỉ lễ', icon: HolidayIcon },
  { to: '/admin/staff', label: 'Nhân sự', icon: StaffIcon },
  { to: '/admin/assignees', label: 'Người phụ trách', icon: AssigneeIcon },
  { to: '/admin/faq', label: 'Cơ sở tri thức', icon: FaqIcon },
  { to: '/admin/faq-candidates', label: 'Đề xuất FAQ', icon: FaqCandidateIcon },
];

const SUPER_ADMIN_NAV_ITEMS = [
  { to: '/admin/users', label: 'Quản lý tài khoản', icon: UsersIcon },
];

export default function AdminLayout({ admin, onLoggedOut }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post('/admin/logout', {});
    onLoggedOut();
    navigate('/admin/login');
  };

  const navItems = admin?.role === 'super_admin' ? [...NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <div className="min-h-screen flex gap-4 p-4">
      <OrganicBackdrop />
      <aside className="relative z-10 w-60 shrink-0 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 flex flex-col py-6 px-4 h-[calc(100vh-2rem)] sticky top-4">
        <div className="flex items-center px-2 mb-8">
          <img src={`/logo.svg?filetime=${FILE_TIME}`} alt="Trung tâm Tin học" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-md shadow-brand-500/30'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 pt-4 mt-4 flex items-center gap-2 px-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold">
            {(admin?.fullName || admin?.username)?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{admin?.fullName || admin?.username}</p>
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

      <main className="relative z-10 flex-1 py-2 pr-2 overflow-x-hidden">
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
function AssigneeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
      <path d="M9 12.5 11 14.5 15.5 10" />
    </svg>
  );
}
function SlaIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 3h6" strokeLinecap="round" />
    </svg>
  );
}
function HolidayIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
      <path d="M8 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FaqCandidateIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.8-2 3.3M12 16.5v.1" strokeLinecap="round" />
      <circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 4.5a3 3 0 0 1 0 6M20 20c0-2.6-1.6-4.4-4-5.1" />
    </svg>
  );
}
function FaqIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.8-2 3.3M12 16.5v.1" strokeLinecap="round" />
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
