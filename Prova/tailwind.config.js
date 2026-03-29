/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#0A0A0A',
        surface: '#111111',
        border:  '#1F1F1F',
        muted:   '#3A3A3A',
        dim:     '#6B7280',
        text:    '#E8E8E8',
        valid:   '#22C55E',
        invalid: '#EF4444',
      },
      fontFamily: {
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'Courier New', 'monospace'],
        sans:    ['var(--font-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-valid': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(34, 197, 94, 0.08)' },
        },
        'pulse-invalid': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(239, 68, 68, 0.08)' },
        },
      },
      animation: {
        'fade-up':       'fade-up 0.5s ease both',
        'fade-in':       'fade-in 0.4s ease both',
        'pulse-valid':   'pulse-valid 2s ease-in-out infinite',
        'pulse-invalid': 'pulse-invalid 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
