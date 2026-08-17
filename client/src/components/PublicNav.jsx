import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faMagnifyingGlass, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import ThemeToggle from './ThemeToggle.jsx';

const LINKS = [
  { to: '/', label: 'Gửi yêu cầu', icon: faPaperPlane },
  { to: '/tra-cuu', label: 'Tra cứu', icon: faMagnifyingGlass },
  { to: '/faq', label: 'FAQ', icon: faCircleQuestion },
];

// Thanh điều hướng mỏng, cố định trên cùng — hiện diện đồng thời trên cả 3 trang công khai,
// thay vì mỗi trang chỉ có 1-2 liên kết chéo rải rác ở đầu/cuối trang. Dựa vào ".dark" đã gắn ở
// gốc trang (bởi component cha) nên chỉ cần "dark:" thường, không cần nhận prop theme riêng cho
// phần link — riêng nút chuyển sáng/tối gắn LUÔN vào đây (thay vì nổi rời góc phải) nên vẫn cần
// nhận theme/onToggleTheme từ trang cha để truyền xuống.
export default function PublicNav({ theme, onToggleTheme }) {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-20 mb-6 -mx-4 px-4 py-2 bg-white/90 backdrop-blur-xl border-b border-white/60 dark:bg-ink/95 dark:border-white/10">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {LINKS.map(({ to, label, icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-md shadow-brand-500/30 dark:from-volt dark:to-mint dark:text-ink dark:shadow-volt/20'
                    : 'text-slate-600 hover:bg-white dark:text-ash dark:hover:bg-white/10'
                }`}
              >
                <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="inline" />
      </div>
    </nav>
  );
}
