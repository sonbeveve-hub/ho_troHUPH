import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      className="fixed top-4 right-4 z-20 h-11 w-11 rounded-full flex items-center justify-center
                 bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg text-slate-600
                 hover:scale-105 active:scale-95 transition
                 dark:bg-ink-2/90 dark:border-white/10 dark:text-volt dark:shadow-black/40"
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
    </button>
  );
}
