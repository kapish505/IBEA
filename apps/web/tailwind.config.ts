import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        'base-0': '#050505',
        'base-1': '#0D0D0D',
        'base-2': '#111111',
        'base-3': '#161616',
        border: '#1C1C1C',
        'border-subtle': '#141414',

        // Semantic state colors
        safe: '#2D6A4F',
        'safe-text': '#6EE7B7',
        elevated: '#92400E',
        'elevated-text': '#FCD34D',
        critical: '#7F1D1D',
        'critical-text': '#FCA5A5',
        semantic: '#1E3A5F',
        'semantic-text': '#93C5FD',
        infra: '#1C1C1C',
        'infra-text': '#9CA3AF',

        // Text hierarchy
        'text-primary': '#F5F5F5',
        'text-secondary': '#A3A3A3',
        'text-tertiary': '#525252',
        'text-quaternary': '#2A2A2A',
      },
      fontFamily: {
        mono: ['Geist Mono', 'monospace'],
        sans: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Satoshi', 'Inter Tight', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        px: '1px',
        0.5: '0.125rem',
        1.5: '0.375rem',
      },
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
      },
      animation: {
        'pulse-safe': 'pulse-safe 3s ease-in-out infinite',
        'pulse-critical': 'pulse-critical 1.5s ease-in-out infinite',
        'flow-line': 'flow-line 2s linear infinite',
        'scan': 'scan 4s linear infinite',
        'first': 'moveVertical 30s ease infinite',
        'second': 'moveInCircle 20s reverse infinite',
        'third': 'moveInCircle 40s linear infinite',
        'fourth': 'moveHorizontal 40s ease infinite',
        'fifth': 'moveInCircle 20s ease infinite',
      },
      keyframes: {
        'pulse-safe': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'pulse-critical': {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        'flow-line': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'moveHorizontal': {
          '0%': { transform: 'translateX(-50%) translateY(-10%)' },
          '50%': { transform: 'translateX(50%) translateY(10%)' },
          '100%': { transform: 'translateX(-50%) translateY(-10%)' },
        },
        'moveInCircle': {
          '0%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(180deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'moveVertical': {
          '0%': { transform: 'translateY(-50%)' },
          '50%': { transform: 'translateY(50%)' },
          '100%': { transform: 'translateY(-50%)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
