import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGaugeHigh,
  faInbox,
  faBuilding,
  faLayerGroup,
  faClock,
  faStopwatch,
  faCalendarDays,
  faAddressBook,
  faUserGear,
  faCircleQuestion,
  faLightbulb,
  faUserShield,
  faRightFromBracket,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { api } from '../../api/client.js';
import OrganicBackdrop from '../../components/OrganicBackdrop.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { FILE_TIME } from '../../utils/cacheBust.js';

// fullAdminOnly: true — ẩn khỏi role 'handler' (người phụ trách chỉ xử lý yêu cầu được phân
// công, không cấu hình danh mục/SLA/ngày nghỉ/nhân sự/FAQ). Backend cũng chặn tương ứng bằng
// requireFullAdmin, đây chỉ là ẩn UI cho gọn.
const NAV_ITEMS = [
  { to: '/admin', label: 'Tổng quan', icon: faGaugeHigh, end: true },
  { to: '/admin/requests', label: 'Yêu cầu', icon: faInbox },
  { to: '/admin/departments', label: 'Đơn vị', icon: faBuilding, fullAdminOnly: true },
  { to: '/admin/request-types', label: 'Loại yêu cầu', icon: faLayerGroup, fullAdminOnly: true },
  { to: '/admin/processing-times', label: 'Thời gian xử lý', icon: faClock, fullAdminOnly: true },
  { to: '/admin/sla-rules', label: 'Quy tắc SLA', icon: faStopwatch, fullAdminOnly: true },
  { to: '/admin/holidays', label: 'Ngày nghỉ lễ', icon: faCalendarDays, fullAdminOnly: true },
  { to: '/admin/staff', label: 'Nhân sự', icon: faAddressBook, fullAdminOnly: true },
  { to: '/admin/assignees', label: 'Người phụ trách', icon: faUserGear, fullAdminOnly: true },
  { to: '/admin/faq', label: 'Cơ sở tri thức', icon: faCircleQuestion, fullAdminOnly: true },
  { to: '/admin/faq-candidates', label: 'Đề xuất FAQ', icon: faLightbulb, fullAdminOnly: true },
  { to: '/admin/changelog', label: 'Thông tin cập nhật', icon: faClockRotateLeft },
];

const SUPER_ADMIN_NAV_ITEMS = [
  { to: '/admin/users', label: 'Quản lý tài khoản', icon: faUserShield },
];

export default function AdminLayout({ admin, onLoggedOut }) {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme('hotro-admin-theme');

  const handleLogout = async () => {
    await api.post('/admin/logout', {});
    onLoggedOut();
    navigate('/admin/login');
  };

  const baseItems =
    admin?.role === 'handler' ? NAV_ITEMS.filter((item) => !item.fullAdminOnly) : NAV_ITEMS;
  const navItems = admin?.role === 'super_admin' ? [...baseItems, ...SUPER_ADMIN_NAV_ITEMS] : baseItems;

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className="min-h-screen flex gap-4 p-4 dark:bg-ink transition-colors duration-300">
      <OrganicBackdrop />
      <aside className="relative z-10 w-60 shrink-0 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 flex flex-col py-6 px-4 h-[calc(100vh-2rem)] sticky top-4">
        <div className="flex items-center px-2 mb-8">
          <img
            src={theme === 'dark' ? `/logo-dark.svg?filetime=${FILE_TIME}` : `/logo.svg?filetime=${FILE_TIME}`}
            alt="Trung tâm Tin học"
            className="h-9 w-auto"
          />
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon, end }) => (
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
              <FontAwesomeIcon icon={icon} className="h-4 w-4" fixedWidth />
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
          <ThemeToggle theme={theme} onToggle={toggleTheme} variant="inline" />
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="text-slate-400 hover:text-slate-700"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex-1 py-2 pr-2 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
    </div>
  );
}
