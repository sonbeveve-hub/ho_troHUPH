/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2F0FE',
          100: '#E5E1FD',
          200: '#C7BFFB',
          400: '#8B7BF4',
          500: '#6C5CE7',
          600: '#5B4BDB',
          700: '#4A3BC2',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
