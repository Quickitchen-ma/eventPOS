/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4f8',
          100: '#d9e6f0',
          200: '#b3cde1',
          300: '#8db4d2',
          400: '#679bc3',
          500: '#4182b4',
          600: '#1C4765',
          700: '#163a52',
          800: '#102d3f',
          900: '#0a202c',
        },
      },
    },
  },
  plugins: [],
};
