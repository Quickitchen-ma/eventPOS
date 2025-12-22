/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9f4',
          100: '#dcf2e6',
          200: '#bae6d1',
          300: '#87d4b3',
          400: '#4eba8c',
          500: '#2da06d',
          600: '#184823',
          700: '#143a1d',
          800: '#0f2c16',
          900: '#0a1e0f',
        },
      },
    },
  },
  plugins: [],
};
