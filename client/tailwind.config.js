/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Wordle-inspired colors
        'tile-green': '#538d4e',
        'tile-yellow': '#b59f3b',
        'tile-grey': '#3a3a3c',
        'tile-empty': '#121213',
        'tile-border': '#3a3a3c',
        // UI colors
        'arena-bg': '#0a0a0b',
        'arena-card': '#1a1a1b',
        'arena-border': '#2a2a2b',
        'arena-accent': '#6366f1',
        'arena-success': '#22c55e',
        'arena-warning': '#eab308',
        'arena-error': '#ef4444',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      animation: {
        'flip': 'flip 0.5s ease-in-out',
        'bounce-in': 'bounceIn 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateX(0)' },
          '50%': { transform: 'rotateX(90deg)' },
          '100%': { transform: 'rotateX(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.8)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}


