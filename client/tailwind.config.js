/** @type {import('tailwindcss').Config} */
export default {
  // 'class' (không phải mặc định 'media') vì chế độ tối chỉ bật bằng nút bấm thủ công của
  // người dùng trên các trang công khai, không theo cài đặt hệ điều hành — xem
  // client/src/hooks/useTheme.js. Lớp "dark" chỉ gắn trên phần tử gốc của TỪNG trang công khai
  // (không phải <html>), nên khu quản trị (/admin/*) không bao giờ bị ảnh hưởng.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Be Vietnam Pro', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#C7EDDD',
          100: '#CFF3E0',
          200: '#9FE6C0',
          400: '#3FAE7C',
          500: '#1F8F58',
          600: '#1B7A4D',
          700: '#146B42',
        },
        // Bảng màu chế độ tối cho các trang công khai (theo bộ màu người dùng cung cấp).
        ink: {
          DEFAULT: '#0F1012',
          2: '#17181B',
          3: '#1F2024',
        },
        volt: '#B2EE37',
        mint: '#58F670',
        paper: '#FCFCFC',
        ash: '#7C7C74',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
