/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
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
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
