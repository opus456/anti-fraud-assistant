/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 浅色层级
        light: { DEFAULT: '#F8FAFC', 50: '#FFFFFF', 100: '#F8FAFC', 200: '#F1F5F9', 300: '#E2E8F0', 400: '#CBD5E1', 500: '#94A3B8' },
        card: { DEFAULT: 'rgba(255,255,255,0.85)', hover: 'rgba(255,255,255,0.95)', border: 'rgba(15,118,110,0.12)', 'border-hover': 'rgba(15,118,110,0.3)' },

        // 强调色 - 沉稳青绿 Teal
        accent: { 50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E', 800: '#115E59', 900: '#134E4A' },

        // 状态色
        danger: { 50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF', 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48', 700: '#BE123C' },
        safe: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#059669' },
        warning: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },

        text: { primary: '#0F172A', secondary: '#475569', muted: '#64748B', light: '#94A3B8', title: '#0F172A', body: '#334155' },
        border: { DEFAULT: '#E2E8F0', light: '#F1F5F9', focus: '#0D9488' },
        surface: { 50: '#FFFFFF', 100: '#F8FAFC', 200: '#F1F5F9', 300: '#E2E8F0', 400: '#CBD5E1' },
        primary: { 50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E' },
      },

      backgroundImage: {
        'abyss': 'linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 30%, #F0FDFA 70%, #F8FAFC 100%)',
        'abyss-radial': 'radial-gradient(ellipse at 50% 0%, #EFF6FF 0%, #F8FAFC 70%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(248,250,252,0.6) 100%)',
        'btn-primary': 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
        'glow-cyan': 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)',
        'grid-pattern': 'linear-gradient(rgba(14,116,144,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.04) 1px, transparent 1px)',
      },

      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'glass-hover': '0 8px 32px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.1)',
        'btn': '0 2px 8px rgba(14,116,144,0.2)',
        'btn-hover': '0 4px 14px rgba(14,116,144,0.3)',
        'input-focus': '0 0 0 3px rgba(20,184,166,0.15)',
        'dropdown': '0 10px 40px rgba(0,0,0,0.12)',
        'glow': '0 0 20px rgba(20,184,166,0.1)',
        'glow-lg': '0 0 40px rgba(20,184,166,0.08)',
        'neon': '0 0 8px rgba(20,184,166,0.2), 0 0 30px rgba(20,184,166,0.06)',
        'inset': 'inset 0 2px 4px rgba(0,0,0,0.04)',
      },

      borderRadius: { 'card': '16px', 'btn': '10px', 'input': '10px', '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
      spacing: { '18': '4.5rem', '22': '5.5rem', 'sidebar': '68px', 'sidebar-expanded': '220px' },

      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in-down': { '0%': { opacity: '0', transform: 'translateY(-16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-soft': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'ring-rotate': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'ring-glow': { '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(44,197,189,0.3))' }, '50%': { filter: 'drop-shadow(0 0 20px rgba(44,197,189,0.6))' } },
        'scan-sweep': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'data-flow': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '10%': { opacity: '1' }, '90%': { opacity: '1' }, '100%': { opacity: '0', transform: 'translateY(-10px)' } },
        'dock-bounce': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        'aurora': { '0%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' }, '100%': { backgroundPosition: '0% 50%' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-down': 'fade-in-down 0.4s ease-out',
        'scale-in': 'scale-in 0.25s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'ring-rotate': 'ring-rotate 20s linear infinite',
        'ring-glow': 'ring-glow 3s ease-in-out infinite',
        'scan-sweep': 'scan-sweep 4s linear infinite',
        'data-flow': 'data-flow 3s ease-in-out infinite',
        'dock-bounce': 'dock-bounce 0.4s ease-out',
        'aurora': 'aurora 8s ease infinite',
      },

      fontSize: {
        'elder-sm': ['1.125rem', { lineHeight: '1.6' }],
        'elder-base': ['1.25rem', { lineHeight: '1.6' }],
        'elder-lg': ['1.5rem', { lineHeight: '1.5' }],
        'elder-xl': ['1.75rem', { lineHeight: '1.4' }],
        'elder-2xl': ['2rem', { lineHeight: '1.3' }],
      },

      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
