/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Brand palette
        brand: {
          50:  '#edfff4',
          100: '#d5ffe8',
          200: '#aeffd5',
          300: '#70fdb8',
          400: '#2bf294',
          500: '#00d97a',
          600: '#00b362',
          700: '#008c4e',
          800: '#006e3f',
          900: '#005a35',
          950: '#003320',
        },
        // Accent
        accent: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Surface/neutral
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Status
        warning: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c' },
        danger:  { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
        success: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        solar:   { 400: '#fde047', 500: '#eab308', 600: '#ca8a04' },
        bio:     { 400: '#86efac', 500: '#22c55e', 600: '#16a34a' },
        grid:    { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
        battery: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 4s linear infinite',
        'bounce-sm': 'bounce 1.5s infinite',
        'fade-in': 'fadeIn 0.4s ease-in-out',
        'slide-in-right': 'slideInRight 0.35s ease-out',
        'slide-in-left': 'slideInLeft 0.35s ease-out',
        'ticker': 'ticker 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        ticker: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(0, 217, 122, 0.35)',
        'glow-blue':  '0 0 20px rgba(14, 165, 233, 0.35)',
        'glow-yellow':'0 0 20px rgba(234, 179, 8, 0.35)',
        'inner-lg': 'inset 0 2px 8px 0 rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
};
