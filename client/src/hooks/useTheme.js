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
  }, [theme, storageKey]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return [theme, toggleTheme];
}
