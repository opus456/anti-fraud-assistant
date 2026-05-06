import { create } from 'zustand';
import { persist } from 'zustand/middleware';

let transitionTimer: ReturnType<typeof setTimeout> | null = null;

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
  preferenceUserKey: string | number | null;

  setMode: (mode: UserMode, options?: { manual?: boolean; userKey?: string | number | null }) => void;
}

export const useModeStore = create<ModeStore>()(
  persist(
    (set, get) => ({
      mode: 'standard',
      config: MODE_CONFIGS.standard,
      isTransitioning: false,
      preferenceUserKey: null,

      setMode: (mode: UserMode, options) => {
        if (transitionTimer) {
          clearTimeout(transitionTimer);
        }

        const nextPreferenceUserKey = options?.manual
          ? (options.userKey ?? null)
          : get().preferenceUserKey;

        set({
          mode,
          config: MODE_CONFIGS[mode],
          isTransitioning: true,
          preferenceUserKey: nextPreferenceUserKey,
        });

        transitionTimer = setTimeout(() => {
          set({ isTransitioning: false });
          transitionTimer = null;
        }, 150);
      },
    }),
    {
      name: 'anti-fraud-mode',
      partialize: (state) => ({
        mode: state.mode,
        preferenceUserKey: state.preferenceUserKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.config = MODE_CONFIGS[state.mode];
          state.isTransitioning = false;
          state.preferenceUserKey = state.preferenceUserKey ?? null;
        }
      },
    }
  )
);
