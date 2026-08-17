import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

// variant="floating" (mặc định, dùng ở trang công khai) — nút tròn nổi cố định góc màn hình.
// variant="inline" (dùng trong sidebar quản trị) — không "fixed", để không đè lên các nút thao
// tác riêng của từng trang (vd. "Xuất Excel" ở góc phải trên của Tổng quan).
export default function ThemeToggle({ theme, onToggle, variant = 'floating' }) {
  const isDark = theme === 'dark';
  const title = isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={title}
        aria-label={title}
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition
                   text-slate-500 hover:bg-white hover:text-slate-700
                   dark:text-volt dark:hover:bg-white/10 dark:hover:text-volt"
      >
        <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      aria-label={title}
      className="fixed top-4 right-4 z-20 h-11 w-11 rounded-full flex items-center justify-center
                 bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg text-slate-600
                 hover:scale-105 active:scale-95 transition
                 dark:bg-ink-2/90 dark:border-white/10 dark:text-volt dark:shadow-black/40"
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
    </button>
  );
}
