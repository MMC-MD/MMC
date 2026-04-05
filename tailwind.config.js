/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './pages/**/*.html',
    './includes/**/*.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        'brand-blue': '#0d47a1',
        'brand-orange': '#ff8f00',
        'light-gray': '#fafafa',
        'dark-gray': '#212121',
        'medium-gray': '#616161',
        'light-blue-bg': '#f5f9ff',
        'deep-blue': '#002171',
        'light-blue': '#1976d2',
      }
    }
  },
  plugins: [],
}
