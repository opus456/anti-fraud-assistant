/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 浅色背景层级
        light: { DEFAULT: '#F0F8FF', 50: '#FFFFFF', 100: '#F8FCFF', 200: '#F0F8FF', 300: '#EAF4FC', 400: '#E0F2FE', 500: '#D6EEFF' },
        card: { DEFAULT: '#FFFFFF', hover: '#FAFCFF', border: '#E0F2FE', 'border-hover': '#93C5FD' },
        
        // 主色 - Trust Blue #007AFF
        sky: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#007AFF', 600: '#0063D1', 700: '#004AAD', 800: '#003D8F', 900: '#002E6B' },
        
        // 辅高亮色 - 香槟金
        gold: { 50: '#FEFCE8', 100: '#FEF9C3', 200: '#FEF08A', 300: '#FDE047', 400: '#FACC15', 500: '#EAB308', 600: '#CA8A04', 700: '#A16207', 800: '#854D0E', 900: '#713F12' },
        
        // 状态色
        danger: { 50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF', 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48', 700: '#BE123C' },
        safe: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#059669' },
        warning: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
        purple: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
        cyan: { 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2' },
        
        text: { primary: '#1E293B', secondary: '#475569', muted: '#64748B', light: '#94A3B8', title: '#1E293B', body: '#475569' },
        border: { DEFAULT: '#E2E8F0', light: '#F1F5F9', focus: '#007AFF' },
        surface: { 50: '#FFFFFF', 100: '#F8FAFC', 200: '#F1F5F9', 300: '#E2E8F0', 400: '#CBD5E1' },
        primary: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#007AFF', 600: '#0063D1', 700: '#004AAD' },
      },
      
      backgroundImage: {
        'light-gradient': 'linear-gradient(135deg, #F0F8FF 0%, #E0F2FE 50%, #F8FCFF 100%)',
        'light-radial': 'radial-gradient(ellipse at top, #FFFFFF 0%, #F0F8FF 70%)',
        'card-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #F8FCFF 100%)',
        'btn-primary': 'linear-gradient(135deg, #007AFF 0%, #0063D1 100%)',
        'btn-gold': 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
        'glow-sky': 'radial-gradient(circle, rgba(0,122,255,0.15) 0%, transparent 70%)',
        'glow-gold': 'radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)',
      },
      
      boxShadow: {
        'card': '0 4px 24px rgba(0, 122, 255, 0.07)',
        'card-hover': '0 8px 32px rgba(0, 122, 255, 0.14)',
        'card-lg': '0 12px 40px rgba(0, 122, 255, 0.12)',
        'btn': '0 4px 14px rgba(0, 122, 255, 0.3)',
        'btn-hover': '0 6px 20px rgba(0, 122, 255, 0.4)',
        'navbar': '0 2px 20px rgba(0, 122, 255, 0.08)',
        'input-focus': '0 0 0 3px rgba(0, 122, 255, 0.15)',
        'dropdown': '0 10px 40px rgba(0, 122, 255, 0.12)',
        'inset': 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
        'glow-blue': '0 0 20px rgba(0, 122, 255, 0.15)',
      },
      
      borderRadius: { 'card': '16px', 'btn': '10px', 'input': '10px', '2xl': '1rem', '3xl': '1.5rem' },
      spacing: { '18': '4.5rem', '22': '5.5rem' },
      backdropBlur: { 'xs': '2px', 'glass': '16px' },
      
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in-down': { '0%': { opacity: '0', transform: 'translateY(-20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'count-up': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'pulse-soft': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'bounce-soft': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        'float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
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
      },
    },
  },
  plugins: [],
};
