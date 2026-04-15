/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#060d1a',
        panel: '#0b1628',
        surface: '#0f1e35',
        border: 'rgba(255,255,255,0.08)',
        accent: '#3b9eff',
        'accent-2': '#00d4aa',
        mint: '#34d399',
        amber: '#fbbf24',
        rose: '#f43f5e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px rgba(59,158,255,0.15), 0 24px 80px rgba(0,0,0,0.5)',
        'glow-sm': '0 0 20px rgba(59,158,255,0.1)',
        'glow-mint': '0 0 30px rgba(0,212,170,0.15)',
        card: '0 8px 32px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-mesh':
          'radial-gradient(circle at 20% 20%, rgba(59,158,255,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,212,170,0.1) 0%, transparent 40%), radial-gradient(circle at 60% 30%, rgba(139,92,246,0.08) 0%, transparent 35%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        pulse2: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
