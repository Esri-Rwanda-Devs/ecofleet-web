/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Color fund from the BTS driver app: deep teal + mint surfaces + orange stops.
      colors: {
        primary: {
          DEFAULT: '#0B6B5C',
          dark: '#085547',
          light: '#14A38B',
        },
        accent: '#E67E22', // upcoming stop markers (mobile orange)
        canvas: '#F3FAF8',
        ink: {
          DEFAULT: '#0F2E29',
          soft: '#3D5C56',
        },
        muted: {
          DEFAULT: '#6B8480',
          bg: '#E8F5F2',
        },
        line: {
          DEFAULT: '#CDE8E2',
          light: '#E8F5F2',
        },
        success: {
          DEFAULT: '#0B6B5C',
          bg: '#D8F3EC',
        },
        warning: {
          DEFAULT: '#E67E22',
          bg: '#FFF1E3',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
        },
        info: {
          bg: '#E8F5F2',
        },
        st: {
          onroute: '#0B6B5C',
          'onroute-bg': '#D8F3EC',
          deadhead: '#E67E22',
          'deadhead-bg': '#FFF1E3',
          gpslost: '#B45309',
          'gpslost-bg': '#FEF3C7',
          early: '#0E7490',
          'early-bg': '#CFFAFE',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        data: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '700' }],
        h1: ['1.625rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '700' }],
        h2: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        h3: ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.5' }],
        small: ['0.875rem', { lineHeight: '1.45' }],
        caption: ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        sheet: '20px',
        '2.5xl': '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,107,92,0.04), 0 4px 12px rgba(11,107,92,0.06)',
        panel: '0 8px 24px rgba(11,107,92,0.08)',
        pop: '0 16px 40px rgba(15,46,41,0.12)',
        glass: '0 4px 24px rgba(11,107,92,0.08), 0 1px 2px rgba(15,46,41,0.04)',
        sheet: '0 8px 30px rgba(15,46,41,0.1), 0 2px 8px rgba(11,107,92,0.05)',
        'focus-primary': '0 0 0 3px rgba(11,107,92,0.18)',
        'ring-selected': '0 0 0 2px rgba(11,107,92,0.35)',
        'ring-next': '0 0 0 4px rgba(11,107,92,0.18)',
        inner: 'inset 0 1px 2px rgba(11,107,92,0.06)',
      },
      keyframes: {
        'drawer-in': {
          from: { transform: 'translateX(12px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'sheet-in': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'drawer-in': 'drawer-in 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-in': 'sheet-in 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
