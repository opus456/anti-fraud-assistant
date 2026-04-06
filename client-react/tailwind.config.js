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
           现代浅色科技风设计系统 - Light Tech Theme v5.0
           干净 · 通透 · 有呼吸感
           ========================================== */
        
        // 浅色背景层级 - 柔和极浅蓝
        light: {
          DEFAULT: '#F0F8FF',
          50: '#FFFFFF',
          100: '#F8FCFF',
          200: '#F0F8FF',
          300: '#EAF4FC',
          400: '#E0F2FE',
          500: '#D6EEFF',
        },
        
        // 卡片/容器 - 纯白带淡蓝阴影
        card: {
          DEFAULT: '#FFFFFF',
          hover: '#FAFCFF',
          border: '#E0F2FE',
          'border-hover': '#BAE6FD',
        },
        
        // 主高亮色 - 天空蓝/亮青蓝 (按钮/激活/重要)
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
        
        // 辅高亮色 - 香槟金/浅卡其 (Hover/特殊点缀)
        gold: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
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
        
        // 文本颜色 - 深色系（浅色背景专用）
        text: {
          primary: '#1E293B',    // 深灰蓝 - 主标题
          secondary: '#475569',   // 中灰蓝 - 正文
          muted: '#64748B',       // 浅灰蓝 - 次要
          light: '#94A3B8',       // 更浅 - 占位符
          // 兼容旧命名
          title: '#1E293B',
          body: '#475569',
        },
        
        // 边框颜色
        border: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
          focus: '#0EA5E9',
        },
        
        // 兼容旧命名的表面色
        surface: {
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1',
        },
        
        // 兼容旧命名的主色
        primary: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },
      },
      
      backgroundImage: {
        // 全局浅色渐变背景
        'light-gradient': 'linear-gradient(135deg, #F0F8FF 0%, #E0F2FE 50%, #F8FCFF 100%)',
        'light-radial': 'radial-gradient(ellipse at top, #FFFFFF 0%, #F0F8FF 70%)',
        // 卡片渐变
        'card-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #F8FCFF 100%)',
        // 按钮渐变
        'btn-primary': 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
        'btn-gold': 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
        // 柔和光晕
        'glow-sky': 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
        'glow-gold': 'radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)',
      },
      
      boxShadow: {
        // 卡片阴影 - 淡蓝色调
        'card': '0 4px 20px rgba(14, 165, 233, 0.08)',
        'card-hover': '0 8px 30px rgba(14, 165, 233, 0.15)',
        'card-lg': '0 12px 40px rgba(14, 165, 233, 0.12)',
        // 按钮阴影
        'btn': '0 4px 14px rgba(14, 165, 233, 0.25)',
        'btn-hover': '0 6px 20px rgba(14, 165, 233, 0.35)',
        // 导航栏阴影
        'navbar': '0 2px 20px rgba(14, 165, 233, 0.08)',
        // 输入框焦点
        'input-focus': '0 0 0 3px rgba(14, 165, 233, 0.15)',
        // 下拉菜单
        'dropdown': '0 10px 40px rgba(14, 165, 233, 0.12)',
        // 内嵌阴影
        'inset': 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      
      borderRadius: {
        'card': '16px',
        'btn': '10px',
        'input': '10px',
        '2xl': '1rem',
        '3xl': '1.5rem',
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
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'count-up': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
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
