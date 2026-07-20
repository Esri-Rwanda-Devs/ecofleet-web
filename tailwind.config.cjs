/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // BTS Operations — green · black · white
      colors: {
        primary: {
          DEFAULT: '#16A34A', // green
          dark: '#15803D',
          light: '#22C55E',
          soft: '#DCFCE7',
        },
        accent: '#0A0A0A', // black
        canvas: '#FFFFFF',
        ink: {
          DEFAULT: '#0A0A0A',
          soft: '#262626',
        },
        muted: {
          DEFAULT: '#525252',
          bg: '#FAFAFA',
        },
        line: {
          DEFAULT: '#E5E5E5',
          light: '#F5F5F5',
        },
        success: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#0A0A0A', // black (attention — no yellow)
          bg: '#F5F5F5',
        },
        danger: {
          DEFAULT: '#0A0A0A',
          bg: '#E5E5E5',
        },
        info: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
        },
        stale: {
          DEFAULT: '#737373',
          bg: '#F5F5F5',
        },
        st: {
          onroute: '#16A34A',
          'onroute-bg': '#DCFCE7',
          deadhead: '#0A0A0A',
          'deadhead-bg': '#F5F5F5',
          gpslost: '#737373',
          'gpslost-bg': '#F5F5F5',
          early: '#16A34A',
          'early-bg': '#DCFCE7',
          critical: '#0A0A0A',
          'critical-bg': '#E5E5E5',
        },
      },
      fontFamily: {
        sans: [
          '"IBM Plex Sans"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        data: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        landing: ['"Work Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['1rem', { lineHeight: '1.35', letterSpacing: '-0.015em', fontWeight: '700' }],
        h2: ['0.875rem', { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '700' }],
        h3: ['0.8125rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['0.8125rem', { lineHeight: '1.45' }],
        small: ['0.6875rem', { lineHeight: '1.4' }],
        caption: ['0.625rem', { lineHeight: '1.35', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        sheet: '16px',
        '2.5xl': '12px',
      },
      boxShadow: {
        'focus-primary': '0 0 0 3px rgba(22,163,74,0.22)',
        'ring-selected': '0 0 0 2px rgba(22,163,74,0.32)',
        'ring-next': '0 0 0 3px rgba(22,163,74,0.16)',
        inner: 'inset 0 1px 2px rgba(10,10,10,0.04)',
        card: '0 1px 2px rgba(10,10,10,0.03), 0 2px 8px rgba(10,10,10,0.04)',
        panel: '0 4px 20px rgba(10,10,10,0.06)',
        pop: '0 12px 32px rgba(10,10,10,0.08)',
        glass: '0 2px 16px rgba(10,10,10,0.05)',
        sheet: '0 2px 20px rgba(10,10,10,0.06)',
      },
      keyframes: {
        'drawer-in': {
          from: { transform: 'translateX(16px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'sheet-in': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'landing-fade': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'route-draw': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        'bus-glide': {
          '0%': { offsetDistance: '0%' },
          '100%': { offsetDistance: '100%' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(3%, -2%) scale(1.06)' },
        },
        'ping-soft': {
          '0%': { transform: 'scale(1)', opacity: '0.45' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        'drawer-in': 'drawer-in 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-in': 'sheet-in 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
        'landing-fade': 'landing-fade 800ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'landing-fade-delay': 'landing-fade 800ms cubic-bezier(0.16, 1, 0.3, 1) 140ms both',
        'landing-fade-delay-2': 'landing-fade 800ms cubic-bezier(0.16, 1, 0.3, 1) 280ms both',
        'landing-fade-delay-3': 'landing-fade 800ms cubic-bezier(0.16, 1, 0.3, 1) 420ms both',
        'route-draw': 'route-draw 2.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite',
        'ping-soft': 'ping-soft 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bus-glide': 'bus-glide 12s linear infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
};
