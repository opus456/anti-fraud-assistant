import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --------------- 设置类型定义 ---------------
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh' | 'en';
export type FontSize = 'normal' | 'large' | 'xlarge';
export type Sensitivity = 'low' | 'medium' | 'high';

export interface AppSettings {
  // 通用设置
  theme: Theme;
  language: Language;
  fontSize: FontSize;
  
  // 通知设置
  pushNotification: boolean;
  soundAlert: boolean;
  vibrateAlert: boolean;
  
  // 安全设置
  realtimeMonitor: boolean;
  autoBlock: boolean;
  sensitivity: Sensitivity;
  
  // 守护设置
  guardianNotify: boolean;
  emergencyCall: boolean;
}

// --------------- 默认设置 ---------------
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  language: 'zh',
  fontSize: 'normal',
  
  pushNotification: true,
  soundAlert: true,
  vibrateAlert: false,
  
  realtimeMonitor: true,
  autoBlock: false,
  sensitivity: 'medium',
  
  guardianNotify: true,
  emergencyCall: true,
};

// --------------- Store 接口 ---------------
interface SettingsStore {
  settings: AppSettings;
  
  // 更新单个设置
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  
  // 批量更新设置
  updateSettings: (partial: Partial<AppSettings>) => void;
  
  // 重置为默认设置
  resetSettings: () => void;
  
  // 获取实际主题（处理 system 选项）
  getEffectiveTheme: () => 'light' | 'dark';
}

// --------------- 创建 Store ---------------
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }));
        
        // 如果是主题变更，立即应用
        if (key === 'theme') {
          applyTheme(value as Theme);
        }
        
        // 如果是字体大小变更，立即应用
        if (key === 'fontSize') {
          applyFontSize(value as FontSize);
        }
      },
      
      updateSettings: (partial) => {
        set((state) => ({
          settings: { ...state.settings, ...partial },
        }));
        
        // 应用主题和字体
        if (partial.theme) applyTheme(partial.theme);
        if (partial.fontSize) applyFontSize(partial.fontSize);
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
        applyTheme(DEFAULT_SETTINGS.theme);
        applyFontSize(DEFAULT_SETTINGS.fontSize);
      },
      
      getEffectiveTheme: () => {
        const { theme } = get().settings;
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'anti-fraud-settings',
      onRehydrateStorage: () => (state) => {
        // 恢复时应用设置
        if (state) {
          applyTheme(state.settings.theme);
          applyFontSize(state.settings.fontSize);
        }
      },
    }
  )
);

// --------------- 主题应用函数 ---------------
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  
  // 目前只实现浅色主题，深色主题暂时不可用
  // 移除所有主题类
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${effectiveTheme}`);
  
  // 更新 meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0f172a' : '#f0f9ff');
  }
}

// --------------- 字体大小应用函数 ---------------
function applyFontSize(fontSize: FontSize) {
  const root = document.documentElement;
  
  // 移除所有字体大小类
  root.classList.remove('font-normal', 'font-large', 'font-xlarge');
  root.classList.add(`font-${fontSize}`);
  
  // 设置根字体大小
  const sizeMap: Record<FontSize, string> = {
    normal: '16px',
    large: '18px',
    xlarge: '20px',
  };
  root.style.fontSize = sizeMap[fontSize];
}

// --------------- 初始化函数（在 App 启动时调用）---------------
export function initializeSettings() {
  const state = useSettingsStore.getState();
  applyTheme(state.settings.theme);
  applyFontSize(state.settings.fontSize);
}
