/**
 * 全局状态管理 - Zustand
 * 管理用户认证状态和全局数据
 */
import { create } from 'zustand';

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  age: number | null;
  gender: string;
  role_type: string;
  occupation: string;
  education: string;
  province: string;
  city: string;
  risk_score: number;
  total_detections: number;
  fraud_hits: number;
  created_at: string;
}

export interface DetectionResult {
  is_fraud: boolean;
  risk_level: string;
  risk_score: number;
  fraud_type: string | null;
  fraud_type_label: string;
  analysis: string;
  matched_cases: Array<{ title: string; content: string; similarity: number }>;
  suggestions: string[];
  warning_scripts: string[];
  response_time_ms: number;
  alert_actions: string[];
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })(),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    set((state) => {
      const newUser = state.user ? { ...state.user, ...userData } : null;
      if (newUser) localStorage.setItem('user', JSON.stringify(newUser));
      return { user: newUser };
    });
  },
}));

/** 验证已存储的 token 是否有效，无效则自动清除 */
export async function validateStoredToken() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const { default: api } = await import('../api');
    const { data } = await api.get('/auth/me');
    useAuthStore.getState().setAuth(data, token);
  } catch (err: any) {
    // 只在明确的 401 时清除，网络错误不清除
    if (err?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
  }
}
