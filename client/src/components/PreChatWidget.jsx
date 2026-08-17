import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faXmark, faComments } from '@fortawesome/free-solid-svg-icons';
import { api } from '../api/client.js';

const INTRO_MESSAGE = {
  from: 'ai',
  text: 'Xin chào thầy/cô! Trước khi gửi yêu cầu, thầy/cô mô tả sự cố đang gặp phải ở đây, em sẽ thử gợi ý cách tự khắc phục ngay xem có xử lý được không ạ.',
};

// Widget hỏi AI TRƯỚC KHI tạo yêu cầu — trước đây trợ lý AI chỉ xuất hiện SAU khi đã gửi yêu
// cầu thành công (ChatWidget.jsx), nghĩa là người dùng buộc phải tạo ticket rồi mới được tư
// vấn. Widget này cho phép tự phục vụ sớm hơn, giảm số ticket không thật sự cần TTTH xử lý.
export default function PreChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history = messages;
    setInput('');
    setMessages((m) => [...m, { from: 'user', text }]);
    setBusy(true);
    try {
      const res = await api.post('/ai-presubmit-chat', { message: text, history });
      if (res.configured === false || !res.reply) {
        setUnavailable(true);
        setMessages((m) => [
          ...m,
          {
            from: 'ai',
            text: 'Hiện em chưa thể tự động phân tích sự cố này. Thầy/cô vui lòng điền form gửi yêu cầu bên dưới để TTTH hỗ trợ trực tiếp ạ.',
          },
        ]);
      } else {
        setMessages((m) => [...m, { from: 'ai', text: res.reply }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { from: 'ai', text: err.message || 'Có lỗi xảy ra, vui lòng thử lại.' }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hỏi AI trước khi gửi yêu cầu"
        className="fixed bottom-5 right-5 z-20 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 pl-4 pr-5 py-3 text-white text-sm font-semibold shadow-lg shadow-brand-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition dark:from-volt dark:to-mint dark:text-ink dark:shadow-volt/20"
      >
        <FontAwesomeIcon icon={faComments} className="h-4 w-4" />
        Hỏi AI trước khi gửi
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-20 w-[min(92vw,380px)]">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-white/60 flex flex-col max-h-[70vh] dark:bg-ink-2/95 dark:border-white/10 dark:shadow-black/40">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm dark:from-volt dark:to-mint dark:text-ink">
              <FontAwesomeIcon icon={faRobot} />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-paper truncate">Hỏi AI trước khi gửi yêu cầu</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Đóng"
            className="text-slate-500 hover:text-slate-700 dark:text-ash dark:hover:text-paper shrink-0 px-1"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.from === 'user'
                    ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white dark:from-volt dark:to-mint dark:text-ink'
                    : 'bg-slate-100 text-slate-700 dark:bg-ink-3 dark:text-paper'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 rounded-2xl px-3 py-2 text-sm dark:bg-ink-3 dark:text-ash">Đang soạn phản hồi...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {!unavailable && (
          <p className="px-4 pt-2 text-[11px] text-slate-500 dark:text-ash">
            Chưa khắc phục được? Điền form gửi yêu cầu bên dưới để TTTH hỗ trợ trực tiếp.
          </p>
        )}

        <form onSubmit={handleSend} className="flex gap-2 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mô tả sự cố bạn đang gặp..."
            disabled={busy}
            className="flex-1 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60 dark:border-white/10 dark:bg-ink-3/70 dark:text-paper dark:placeholder:text-ash dark:focus:ring-volt"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:shadow-lg disabled:opacity-60 dark:from-volt dark:to-mint dark:text-ink dark:shadow-volt/20"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
}
