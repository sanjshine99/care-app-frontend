/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf0fc',
          100: '#f2d9f8',
          200: '#e4b2f0',
          300: '#d082e5',
          400: '#b853d6',
          500: '#a238be',
          600: '#9832AE',
          700: '#7e2892',
          800: '#621f72',
          900: '#451551',
        },
      },
    },
  },
  plugins: [],
}
