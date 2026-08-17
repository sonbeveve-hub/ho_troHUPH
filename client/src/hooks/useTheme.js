import { useEffect, useState } from 'react';

const STORAGE_KEY = 'hotro-public-theme';

function readInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

// Trạng thái sáng/tối riêng cho các trang CÔNG KHAI — lưu localStorage, mặc định sáng. Không
// dùng chung cơ chế với khu quản trị (khu quản trị không có chế độ tối).
export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return [theme, toggleTheme];
}
