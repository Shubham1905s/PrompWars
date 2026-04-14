/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        panel: '#0d1728',
        accent: '#4fb3ff',
        mint: '#47c491',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};

