/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        surface: '#16213e',
        'surface-2': '#1a1a2e',
        'surface-3': '#0f3460',
        accent: '#4f8ef7',
        'accent-hover': '#3b82f6'
      }
    }
  },
  plugins: []
}
