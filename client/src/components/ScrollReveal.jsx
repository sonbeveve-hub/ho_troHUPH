import { useEffect, useRef, useState } from 'react';

// Bọc quanh 1 block để hiệu ứng mờ dần + trượt lên khi cuộn tới (chỉ chạy 1 lần, không lặp
// lại khi cuộn qua lại) — dùng IntersectionObserver thuần, không cần thêm thư viện animation.
// Nhận thêm ...rest (id, onClick, aria-*...) và truyền thẳng xuống Tag — thiếu bước này khiến
// id="form" bị rớt mất, nút CTA neo #form không tìm thấy phần tử để cuộn tới.
export default function ScrollReveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
