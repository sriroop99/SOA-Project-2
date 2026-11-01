/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b1329',
          800: '#111e38',
          700: '#1e293b',
          600: '#334155',
        },
        teal: {
          500: '#0d9488',
          600: '#0f766e',
          400: '#14b8a6',
          50: '#f0fdfa',
        },
      },
    },
  },
  plugins: [],
};
