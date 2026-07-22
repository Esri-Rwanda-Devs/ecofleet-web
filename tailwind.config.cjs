/** @type {import('tailwindcss').Config} */

/** Semantic color token → CSS variable, alpha-composable via Tailwind's rgb()/<alpha-value> pattern. */
function themeColor(name) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // EcoFleet Design System — Soft UI Evolution (light + dark, CSS-variable backed)
      colors: {
        primary: {
          DEFAULT: themeColor('primary'),
          dark: themeColor('primary-dark'),
          light: themeColor('primary-light'),
          soft: themeColor('primary-soft'),
        },
        accent: themeColor('accent'),
        canvas: themeColor('canvas'),
        surface: themeColor('surface'),
        ink: {
          DEFAULT: themeColor('ink'),
          soft: themeColor('ink-soft'),
        },
        muted: {
          DEFAULT: themeColor('muted'),
          bg: themeColor('muted-bg'),
        },
        line: {
          DEFAULT: themeColor('line'),
          light: themeColor('line-light'),
        },
        success: {
          DEFAULT: themeColor('success'),
          bg: themeColor('success-bg'),
        },
        warning: {
          DEFAULT: themeColor('warning'), // black in light, near-white in dark — attention, no yellow
          bg: themeColor('warning-bg'),
        },
        danger: {
          DEFAULT: themeColor('danger'),
          bg: themeColor('danger-bg'),
        },
        info: {
          DEFAULT: themeColor('info'),
          bg: themeColor('info-bg'),
        },
        stale: {
          DEFAULT: themeColor('stale'),
          bg: themeColor('stale-bg'),
        },
        st: {
          onroute: themeColor('st-onroute'),
          'onroute-bg': themeColor('st-onroute-bg'),
          deadhead: themeColor('st-deadhead'),
          'deadhead-bg': themeColor('st-deadhead-bg'),
          gpslost: themeColor('st-gpslost'),
          'gpslost-bg': themeColor('st-gpslost-bg'),
          early: themeColor('st-early'),
          'early-bg': themeColor('st-early-bg'),
          critical: themeColor('st-critical'),
          'critical-bg': themeColor('st-critical-bg'),
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
        'focus-primary': '0 0 0 3px rgba(37, 99, 235, 0.22)',
        'ring-selected': '0 0 0 2px rgba(37, 99, 235, 0.32)',
        'ring-next': '0 0 0 3px rgba(37, 99, 235, 0.16)',
        inner: 'inset 0 1px 2px rgba(0,0,0,0.04)',
        card: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)',
        panel: '0 10px 15px rgba(0,0,0,0.08)',
        pop: '0 20px 25px rgba(0,0,0,0.1)',
        glass: '0 4px 16px rgba(0,0,0,0.05)',
        sheet: '0 10px 25px rgba(0,0,0,0.08)',
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
