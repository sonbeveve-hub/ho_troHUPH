import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCircleQuestion, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client.js';
import OrganicBackdrop from '../components/OrganicBackdrop.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import PublicLogo from '../components/PublicLogo.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PublicNav from '../components/PublicNav.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { ChatBubbleIllustration, ShieldCheckIllustration, LaptopIllustration } from '../components/illustrations.jsx';

export default function PublicFaq() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    api
      .get('/faq')
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (i) => i.question.toLowerCase().includes(query) || i.answer.toLowerCase().includes(query)
    );
  }, [items, q]);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className="min-h-screen px-4 pb-16 dark:bg-ink transition-colors duration-300">
      <OrganicBackdrop />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <PublicNav />
      <div className="relative z-10 max-w-2xl mx-auto pt-4 sm:pt-8">
        <div className="mb-6 text-center">
          <div className="mb-5">
            <PublicLogo theme={theme} className="h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent dark:bg-none dark:text-paper">
            Câu hỏi thường gặp
          </h1>
          <p className="mt-3 text-slate-600 dark:text-ash">
            Tổng hợp từ các yêu cầu hỗ trợ đã xử lý — thử tìm ở đây trước khi gửi yêu cầu mới.
          </p>
        </div>

        <div className="relative h-16 mb-4 hidden sm:block" aria-hidden="true">
          <ChatBubbleIllustration
            className="absolute left-2 top-0 h-14 w-14 animate-float hover:scale-110 transition-transform"
            style={{ '--float-rot': '-6deg' }}
          />
          <LaptopIllustration
            className="absolute left-1/2 -translate-x-1/2 top-2 h-12 w-12 animate-float hover:scale-110 transition-transform"
            style={{ '--float-rot': '3deg', animationDelay: '0.6s' }}
          />
          <ShieldCheckIllustration
            className="absolute right-2 top-0 h-14 w-14 animate-float hover:scale-110 transition-transform"
            style={{ '--float-rot': '6deg', animationDelay: '1.2s' }}
          />
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-4 mb-5 dark:bg-ink-2/80 dark:border-white/10 dark:shadow-black/30">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm câu hỏi..."
            className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-ink-3/70 dark:text-paper dark:placeholder:text-ash dark:focus:ring-volt"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300">
            {error}
          </div>
        )}

        {!items && !error && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="animate-pulse bg-white/80 dark:bg-ink-2/80 rounded-2xl border border-white/60 dark:border-white/10 p-4 h-16" />
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <EmptyState
            icon={faCircleQuestion}
            title="Chưa có câu hỏi thường gặp nào"
            description="Cơ sở tri thức sẽ được cập nhật dần từ các yêu cầu đã xử lý."
          />
        )}

        {items && items.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon={faMagnifyingGlass}
            title="Không tìm thấy câu hỏi phù hợp"
            description="Thử một từ khoá khác, hoặc gửi yêu cầu để được hỗ trợ trực tiếp."
          />
        )}

        <div className="space-y-3">
          {filtered.map((item, i) => (
            <ScrollReveal key={item.id} delay={Math.min(i, 6) * 60}>
              <details className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-4 group hover:shadow-md transition dark:bg-ink-2/80 dark:border-white/10 dark:hover:shadow-black/30">
                <summary className="cursor-pointer font-medium text-slate-900 dark:text-paper flex items-start justify-between gap-3">
                  <span>{item.question}</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="text-slate-500 dark:text-ash group-open:rotate-180 transition shrink-0 mt-1"
                  />
                </summary>
                <p className="mt-3 text-sm text-slate-600 dark:text-ash whitespace-pre-wrap">{item.answer}</p>
                {item.request_type_name && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-ash/70">{item.request_type_name}</p>
                )}
              </details>
            </ScrollReveal>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-700 dark:text-paper font-medium">
          Chưa tìm thấy câu trả lời?{' '}
          <Link to="/" className="text-brand-700 dark:text-paper font-semibold hover:underline">
            Gửi yêu cầu hỗ trợ
          </Link>
        </p>
      </div>
    </div>
    </div>
  );
}
