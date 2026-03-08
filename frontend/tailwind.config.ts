import type { Config } from 'tailwindcss'

export default {
  // Scans your HTML and React files to purge unused CSS in production
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary Pink brand color (#ff8fab)
        primary: {
          50:  '#fff0f3',
          100: '#ffe4ea',
          200: '#ffcddb',
          300: '#ffb2c9',
          400: '#ff9bc1',
          500: '#ff8fab', 
          600: '#e5809a',
          700: '#cc7289',
          800: '#b26477',
          900: '#4a1528',
        },
        // Secondary Blue brand color (#4cc9f0)
        secondary: {
          50:  '#f0faff',
          100: '#e0f4fe',
          200: '#bae8fd',
          300: '#7dd6fc',
          400: '#65d0f1',
          500: '#4cc9f0', 
          600: '#44b5d8',
          700: '#3c9fc0',
          800: '#358ba8',
          900: '#153f4d',
        },
        // Glass morphism backgrounds for modern UI components
        glass: {
          white: 'rgba(255,255,255,0.1)',
          dark:  'rgba(0,0,0,0.4)',
          border:'rgba(255,255,255,0.2)',
        },
        // Slate-based dark theme surfaces
        surface: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui'],
        mono:    ['JetBrains Mono', 'ui-monospace'],
        display: ['Outfit', 'ui-sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in'   : 'fadeIn 0.5s ease-in-out',
        'slide-up'  : 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%'  : { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%'  : { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config