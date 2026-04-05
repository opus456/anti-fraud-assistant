/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ==========================================
           高级深色科技风设计系统 - Dark Tech Theme v4.0
           沉浸 · 科技 · 高级感
           ========================================== */
        
        // 深色背景层级 - 科技蓝/暗夜蓝
        dark: {
          DEFAULT: '#0B132B',
          50: '#1C2541',
          100: '#162037',
          200: '#111B2E',
          300: '#0D1525',
          400: '#0B132B',
          500: '#080E1F',
          600: '#050913',
        },
        
        // 卡片/容器 - 半透明深色
        card: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          hover: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(0, 229, 255, 0.15)',
          'border-hover': 'rgba(0, 229, 255, 0.4)',
        },
        
        // 主点缀色 - 荧光青色 (激活/边框/高亮)
        cyan: {
          50: '#E0FCFF',
          100: '#B3F5FF',
          200: '#80EFFF',
          300: '#4DE8FF',
          400: '#00E5FF',
          500: '#00C4D9',
          600: '#00A3B3',
          700: '#00828C',
          800: '#006166',
          900: '#004040',
        },
        
        // 次点缀色 - 亮科技蓝 (按钮/图标)
        neon: {
          50: '#EBF3FF',
          100: '#D6E7FF',
          200: '#ADC8FF',
          300: '#85AAFF',
          400: '#5C8CFF',
          500: '#3A86FF',
          600: '#2E6BD9',
          700: '#2350B3',
          800: '#17358C',
          900: '#0C1A66',
        },
        
        // 警示红 - 保持高可见性
        danger: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
        
        // 安全绿 - 成功状态
        safe: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        
        // 警告橙 - 中等风险
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        
        // 紫色 - 高级感装饰
        purple: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        
        // 文本颜色
        text: {
          primary: '#FFFFFF',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
          dark: '#64748B',
        },
      },
      
      backgroundImage: {
        // 全局深色渐变背景
        'dark-gradient': 'linear-gradient(135deg, #0B132B 0%, #1C2541 50%, #0B132B 100%)',
        'dark-radial': 'radial-gradient(ellipse at top, #1C2541 0%, #0B132B 70%)',
        // 卡片渐变
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        // 按钮渐变
        'btn-cyan': 'linear-gradient(135deg, #00E5FF 0%, #00C4D9 100%)',
        'btn-neon': 'linear-gradient(135deg, #3A86FF 0%, #2E6BD9 100%)',
        // 发光效果
        'glow-cyan': 'radial-gradient(circle, rgba(0,229,255,0.3) 0%, transparent 70%)',
        'glow-neon': 'radial-gradient(circle, rgba(58,134,255,0.3) 0%, transparent 70%)',
      },
      
      boxShadow: {
        // 发光阴影
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.3), 0 0 40px rgba(0, 229, 255, 0.1)',
        'glow-cyan-lg': '0 0 30px rgba(0, 229, 255, 0.4), 0 0 60px rgba(0, 229, 255, 0.2)',
        'glow-neon': '0 0 20px rgba(58, 134, 255, 0.3), 0 0 40px rgba(58, 134, 255, 0.1)',
        // 卡片阴影
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 229, 255, 0.1)',
        // 按钮阴影
        'btn': '0 4px 14px rgba(0, 0, 0, 0.3)',
        'btn-hover': '0 6px 20px rgba(0, 0, 0, 0.4)',
        // 导航栏阴影
        'navbar': '0 4px 30px rgba(0, 0, 0, 0.5)',
        // 内嵌阴影
        'inset': 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        // 下拉菜单
        'dropdown': '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 229, 255, 0.05)',
      },
      
      borderRadius: {
        'card': '16px',
        'btn': '10px',
        'input': '10px',
      },
      
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      
      backdropBlur: {
        'xs': '2px',
        'glass': '12px',
      },
      
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 229, 255, 0.5)' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(0, 229, 255, 0.15)' },
          '50%': { borderColor: 'rgba(0, 229, 255, 0.4)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      
      fontSize: {
        'elder-sm': ['1.125rem', { lineHeight: '1.6' }],
        'elder-base': ['1.25rem', { lineHeight: '1.6' }],
        'elder-lg': ['1.5rem', { lineHeight: '1.5' }],
        'elder-xl': ['1.75rem', { lineHeight: '1.4' }],
        'elder-2xl': ['2rem', { lineHeight: '1.3' }],
      },
      
      fontFamily: {
        'tech': ['Orbitron', 'Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
