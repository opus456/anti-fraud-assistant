import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --------------- 用户模式类型 ---------------
export type UserMode = 'standard' | 'elder' | 'minor';

export interface ModeConfig {
  id: UserMode;
  name: string;
  description: string;
  icon: string;
  fontSize: 'normal' | 'large';
  colorScheme: 'default' | 'highContrast' | 'bright';
  showAdvanced: boolean;
  simplifiedNav: boolean;
  animations: 'normal' | 'reduced' | 'enhanced';
}

// --------------- 模式配置 ---------------
export const MODE_CONFIGS: Record<UserMode, ModeConfig> = {
  standard: {
    id: 'standard',
    name: '标准模式',
    description: '全功能控制台，展示完整的AI分析日志和家庭联动状态',
    icon: '🛡️',
    fontSize: 'normal',
    colorScheme: 'default',
    showAdvanced: true,
    simplifiedNav: false,
    animations: 'normal',
  },
  elder: {
    id: 'elder',
    name: '长辈模式',
    description: '大字体、高对比度，聚焦通话监测和一键求助',
    icon: '👴',
    fontSize: 'large',
    colorScheme: 'highContrast',
    showAdvanced: false,
    simplifiedNav: true,
    animations: 'reduced',
  },
  minor: {
    id: 'minor',
    name: '未成年模式',
    description: '活泼明亮，侧重游戏充值预警和安全学习',
    icon: '🧒',
    fontSize: 'normal',
    colorScheme: 'bright',
    showAdvanced: false,
    simplifiedNav: true,
    animations: 'enhanced',
  },
};

// --------------- 模式 Store ---------------
interface ModeStore {
  mode: UserMode;
  config: ModeConfig;
  isTransitioning: boolean;
  
  setMode: (mode: UserMode) => void;
  toggleMode: () => void;
}

export const useModeStore = create<ModeStore>()(
  persist(
    (set, get) => ({
      mode: 'standard',
      config: MODE_CONFIGS.standard,
      isTransitioning: false,
      
      setMode: (mode: UserMode) => {
        set({ isTransitioning: true });
        // 延迟切换以实现平滑过渡
        setTimeout(() => {
          set({
            mode,
            config: MODE_CONFIGS[mode],
            isTransitioning: false,
          });
        }, 150);
      },
      
      toggleMode: () => {
        const { mode } = get();
        const modes: UserMode[] = ['standard', 'elder', 'minor'];
        const currentIndex = modes.indexOf(mode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        get().setMode(nextMode);
      },
    }),
    {
      name: 'anti-fraud-mode',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.config = MODE_CONFIGS[state.mode];
        }
      },
    }
  )
);

// --------------- 模式相关的CSS类生成器 ---------------
export function getModeClasses(mode: UserMode): string {
  const classes: string[] = [];
  
  switch (mode) {
    case 'elder':
      classes.push('elder-mode');
      break;
    case 'minor':
      classes.push('minor-mode');
      break;
    default:
      classes.push('standard-mode');
  }
  
  return classes.join(' ');
}

// --------------- 文字大小类 ---------------
export function getTextSizeClass(mode: UserMode, baseSize: string): string {
  if (mode !== 'elder') return baseSize;
  
  const sizeMap: Record<string, string> = {
    'text-xs': 'text-elder-xs',
    'text-sm': 'text-elder-sm',
    'text-base': 'text-elder-base',
    'text-lg': 'text-elder-lg',
    'text-xl': 'text-elder-xl',
    'text-2xl': 'text-elder-2xl',
    'text-3xl': 'text-elder-3xl',
  };
  
  return sizeMap[baseSize] || baseSize;
}

// --------------- 按钮样式类 ---------------
export function getButtonClasses(mode: UserMode, variant: 'primary' | 'secondary' | 'danger' = 'primary'): string {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-200';
  
  let sizeClasses = 'px-4 py-2 text-sm rounded-btn';
  let colorClasses = '';
  
  if (mode === 'elder') {
    sizeClasses = 'px-6 py-4 text-elder-lg rounded-xl font-bold';
  }
  
  switch (variant) {
    case 'primary':
      colorClasses = mode === 'elder'
        ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-soft-md'
        : 'bg-primary-500 text-white hover:bg-primary-600 shadow-soft';
      break;
    case 'secondary':
      colorClasses = mode === 'elder'
        ? 'bg-azure-100 text-primary-700 hover:bg-azure-200 border-2 border-primary-300'
        : 'bg-azure-100 text-primary-600 hover:bg-azure-200';
      break;
    case 'danger':
      colorClasses = mode === 'elder'
        ? 'bg-danger-500 text-white hover:bg-danger-600 shadow-soft-md'
        : 'bg-danger-500 text-white hover:bg-danger-600 shadow-soft';
      break;
  }
  
  return `${base} ${sizeClasses} ${colorClasses}`;
}

// --------------- 卡片样式类 ---------------
export function getCardClasses(mode: UserMode, hover: boolean = true): string {
  const base = 'bg-white rounded-card shadow-card transition-all duration-200';
  
  let padding = 'p-5';
  let hoverEffect = hover ? 'hover:shadow-card-hover hover:-translate-y-1' : '';
  
  if (mode === 'elder') {
    padding = 'p-6';
  }
  
  return `${base} ${padding} ${hoverEffect}`;
}
