import { useEffect, useState } from 'react';

function readInitialTheme(storageKey) {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light';
}

// Trạng thái sáng/tối — dùng chung cho cả trang công khai và khu quản trị, nhưng mỗi bên lưu
// localStorage key RIÊNG (mặc định 'hotro-public-theme') để lựa chọn của 2 khu vực độc lập
// với nhau. Mặc định sáng.
export function useTheme(storageKey = 'hotro-public-theme') {
  const [theme, setTheme] = useState(() => readInitialTheme(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, theme);
    // <body> nằm NGOÀI khối bọc ".dark" của từng trang (khối đó chỉ bọc phần nội dung), nên nền
    // #FAFAF9 (sáng) đặt cứng trên body trong index.css không tự đổi theo — lộ ra thành 1 dải
    // sáng ở mép trên/dưới khi trình duyệt "nảy" lúc cuộn quá đầu/cuối trang (elastic overscroll,
    // hay gặp trên trackpad). Đồng bộ thêm class "dark" lên body để nền body cũng đổi theo.
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme, storageKey]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return [theme, toggleTheme];
}
