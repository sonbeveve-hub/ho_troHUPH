import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

// Chatbox AI xuất hiện ngay sau khi gửi yêu cầu thành công: AI đọc mô tả + ảnh đính kèm
// để gợi ý cách tự khắc phục, sau đó hỏi người gửi đã giải quyết được chưa.
export default function ChatWidget({ requestCode, onClose }) {
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Xin chào thầy/cô! Em đang phân tích mô tả sự cố của thầy/cô, vui lòng đợi trong giây lát...' },
  ]);
  const [phase, setPhase] = useState('loading'); // loading | ask | rating | done | unavailable
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const pushAi = (text) => setMessages((m) => [...m, { from: 'ai', text }]);
  const pushUser = (text) => setMessages((m) => [...m, { from: 'user', text }]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase]);

  useEffect(() => {
    let cancelled = false;
    api
      .post(`/requests/${encodeURIComponent(requestCode)}/ai-suggestion`, {})
      .then((res) => {
        if (cancelled) return;
        if (!res.configured || !res.suggestion) {
          pushAi(
            'Hiện em chưa thể tự động phân tích sự cố này. Đội ngũ hỗ trợ của Trung tâm sẽ xem và phản hồi thầy/cô qua email sớm nhất ạ.'
          );
          setPhase('unavailable');
          return;
        }
        pushAi(res.suggestion);
        pushAi('Thầy/cô đã thử theo hướng dẫn trên chưa ạ? Vấn đề đã được khắc phục chưa?');
        setPhase('ask');
      })
      .catch(() => {
        if (cancelled) return;
        pushAi(
          'Hiện em chưa thể tự động phân tích sự cố này. Đội ngũ hỗ trợ của Trung tâm sẽ xem và phản hồi thầy/cô qua email sớm nhất ạ.'
        );
        setPhase('unavailable');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestCode]);

  const handleFeedback = async (resolved) => {
    pushUser(resolved ? 'Đã khắc phục được' : 'Chưa khắc phục được');
    setBusy(true);
    setPhase('working');
    try {
      const res = await api.post(`/requests/${encodeURIComponent(requestCode)}/ai-feedback`, { resolved });
      if (resolved) {
        pushAi('Em rất vui vì đã giúp được thầy/cô! Thầy/cô đánh giá giúp em mức độ hữu ích của gợi ý này nhé.');
        setPhase('rating');
      } else if (res.suggestion) {
        pushAi(res.suggestion);
        pushAi(
          'Nếu cách này vẫn chưa giải quyết được, thầy/cô yên tâm nhé — đội ngũ hỗ trợ của Trung tâm sẽ liên hệ trực tiếp qua email để xử lý dứt điểm ạ.'
        );
        setPhase('done');
      } else {
        pushAi(
          'Không sao ạ, đội ngũ hỗ trợ của Trung tâm sẽ liên hệ trực tiếp với thầy/cô qua email sớm nhất để xử lý dứt điểm. Cảm ơn thầy/cô đã kiên nhẫn!'
        );
        setPhase('done');
      }
    } catch {
      pushAi('Đội ngũ hỗ trợ của Trung tâm sẽ liên hệ trực tiếp với thầy/cô qua email sớm nhất ạ.');
      setPhase('done');
    } finally {
      setBusy(false);
    }
  };

  const handleRate = async (rating) => {
    setBusy(true);
    pushUser(`${rating} sao`);
    try {
      await api.post(`/requests/${encodeURIComponent(requestCode)}/ai-rating`, { rating });
    } catch {
      // đánh giá không gửi được cũng không sao, không chặn trải nghiệm người dùng
    } finally {
      pushAi('Cảm ơn thầy/cô đã đánh giá! Chúc thầy/cô một ngày làm việc hiệu quả.');
      setPhase('done');
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-white/60 flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm">
              🤖
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">Trợ lý AI hỗ trợ kỹ thuật</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0 px-1" title="Đóng">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.from === 'user'
                    ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {(phase === 'loading' || phase === 'working') && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-400 rounded-2xl px-3 py-2 text-sm">Đang soạn phản hồi...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {phase === 'ask' && (
          <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
            <button
              onClick={() => handleFeedback(true)}
              disabled={busy}
              className="flex-1 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/20 hover:shadow-lg disabled:opacity-60"
            >
              Đã khắc phục
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={busy}
              className="flex-1 rounded-full border border-slate-200 bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Chưa được
            </button>
          </div>
        )}

        {phase === 'rating' && (
          <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-slate-100">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                disabled={busy}
                className="text-2xl leading-none px-0.5 text-amber-400 hover:scale-110 transition disabled:opacity-60"
                title={`${star} sao`}
              >
                ★
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
