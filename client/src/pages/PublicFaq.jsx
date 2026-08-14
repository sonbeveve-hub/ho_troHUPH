import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client.js';
import OrganicBackdrop from '../components/OrganicBackdrop.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx';
import { ChatBubbleIllustration, ShieldCheckIllustration, LaptopIllustration } from '../components/illustrations.jsx';
import { FILE_TIME } from '../utils/cacheBust.js';

export default function PublicFaq() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

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
    <div className="min-h-screen px-4 pb-16">
      <OrganicBackdrop />
      <div className="relative z-10 max-w-2xl mx-auto pt-12 sm:pt-16">
        <div className="mb-6 text-center">
          <img src={`/logo.svg?filetime=${FILE_TIME}`} alt="Trung tâm Tin học" className="h-16 w-auto mx-auto mb-5" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            Câu hỏi thường gặp
          </h1>
          <p className="mt-3 text-slate-600">
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

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-4 mb-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm câu hỏi..."
            className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {items && items.length === 0 && (
          <p className="text-center text-slate-400 text-sm">Chưa có câu hỏi thường gặp nào.</p>
        )}

        {items && items.length > 0 && filtered.length === 0 && (
          <p className="text-center text-slate-400 text-sm">Không tìm thấy câu hỏi phù hợp.</p>
        )}

        <div className="space-y-3">
          {filtered.map((item, i) => (
            <ScrollReveal key={item.id} delay={Math.min(i, 6) * 60}>
              <details className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-4 group hover:shadow-md transition">
                <summary className="cursor-pointer font-medium text-slate-900 flex items-start justify-between gap-3">
                  <span>{item.question}</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="text-slate-400 group-open:rotate-180 transition shrink-0 mt-1"
                  />
                </summary>
                <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{item.answer}</p>
                {item.request_type_name && (
                  <p className="mt-2 text-xs text-slate-400">{item.request_type_name}</p>
                )}
              </details>
            </ScrollReveal>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-700 font-medium">
          Chưa tìm thấy câu trả lời?{' '}
          <Link to="/" className="text-brand-700 font-semibold hover:underline">
            Gửi yêu cầu hỗ trợ
          </Link>
        </p>
      </div>
    </div>
  );
}
