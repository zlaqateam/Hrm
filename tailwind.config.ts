import type { Config } from 'tailwindcss';

// Every neutral + surface colour is a CSS variable, so light/dark themes swap in globals.css
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: v('brand'), // Settings > General > Brand colour
        'on-brand': v('on-brand'),
        surface: v('surface'),
        neutral: {
          50: v('n-50'), 100: v('n-100'), 200: v('n-200'), 300: v('n-300'), 400: v('n-400'),
          500: v('n-500'), 600: v('n-600'), 700: v('n-700'), 800: v('n-800'), 900: v('n-900'), 950: v('n-950'),
        },
      },
      fontFamily: {
        display: ['Nasi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(12px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(40px,-30px) scale(1.1)' } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgb(16 185 129 / .55)' }, '100%': { boxShadow: '0 0 0 14px rgb(16 185 129 / 0)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in .25s ease both',
        'scale-in': 'scale-in .2s cubic-bezier(.2,.8,.2,1) both',
        'slide-up': 'slide-up .32s cubic-bezier(.2,.8,.2,1) both',
        'slide-in-left': 'slide-in-left .28s cubic-bezier(.2,.8,.2,1) both',
        'toast-in': 'toast-in .3s cubic-bezier(.2,.8,.2,1) both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 16s ease-in-out infinite',
        pop: 'pop .4s ease',
        'pulse-ring': 'pulse-ring 1.8s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
