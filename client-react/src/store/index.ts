import { create } from 'zustand';

// --------------- Interfaces ---------------

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  role: string;
  age: number | null;
  gender: string | null;
  role_type: string | null;
  occupation: string | null;
  education: string | null;
  province: string | null;
  city: string | null;
  risk_score: number;
  total_detections: number;
  fraud_hits: number;
  created_at: string;
}

export interface CotReasoning {
  urgency_check: string;
  financial_check: string;
  authority_fake_check: string;
  info_theft_check: string;
  too_good_check: string;
  risk_level: string;
  scam_type: string;
}

export interface DetectionResult {
  is_fraud: boolean;
  risk_level: string;
  risk_score: number;
  fraud_type: string;
  fraud_type_label: string;
  analysis: string;
  cot_reasoning: CotReasoning | null;
  matched_cases: Array<string | { title?: string; content?: string; similarity?: number }>;
  suggestions: string[];
  warning_scripts: string[];
  response_time_ms: number;
  alert_actions: string[];
  pipeline?: {
    llm_used?: boolean;
    keyword_score?: number;
    rag_similarity?: number;
    timings_ms?: {
      keyword_ms?: number;
      rag_ms?: number;
      llm_ms?: number;
      fusion_ms?: number;
    };
  };
}

// --------------- Detection Progress ---------------

export type DetectionStage = 'idle' | 'keyword' | 'rag' | 'llm' | 'fusion' | 'complete' | 'error';

export interface DetectionProgress {
  stage: DetectionStage;
  message: string;
  percent: number;
  startTime: number;
  logs: Array<{ time: number; stage: DetectionStage; message: string }>;
}

// --------------- Detection Store ---------------

interface DetectionStore {
  // 输入状态
  inputText: string;
  inputImage: File | null;
  imagePreview: string;
  multimodal: boolean;
  
  // 检测状态
  isDetecting: boolean;
  progress: DetectionProgress;
  result: DetectionResult | null;
  error: string | null;
  
  // 历史记录
  history: Array<{ id: string; text: string; result: DetectionResult; timestamp: number }>;
  
  // Actions
  setInputText: (text: string) => void;
  setInputImage: (file: File | null, preview: string) => void;
  setMultimodal: (enabled: boolean) => void;
  
  startDetection: () => void;
  updateProgress: (stage: DetectionStage, message: string, percent: number) => void;
  setResult: (result: DetectionResult) => void;
  setError: (error: string) => void;
  resetDetection: () => void;
  clearInput: () => void;
}

const initialProgress: DetectionProgress = {
  stage: 'idle',
  message: '',
  percent: 0,
  startTime: 0,
  logs: [],
};

export const useDetectionStore = create<DetectionStore>((set, get) => ({
  // 初始状态
  inputText: '',
  inputImage: null,
  imagePreview: '',
  multimodal: false,
  isDetecting: false,
  progress: initialProgress,
  result: null,
  error: null,
  history: [],

  // 输入操作
  setInputText: (text) => set({ inputText: text }),
  
  setInputImage: (file, preview) => set({ inputImage: file, imagePreview: preview }),
  
  setMultimodal: (enabled) => set({ multimodal: enabled }),

  // 检测流程控制
  startDetection: () => {
    const now = Date.now();
    set({
      isDetecting: true,
      error: null,
      result: null,
      progress: {
        stage: 'keyword',
        message: '正在进行关键词规则扫描...',
        percent: 10,
        startTime: now,
        logs: [{ time: now, stage: 'keyword', message: '开始关键词规则扫描' }],
      },
    });
  },

  updateProgress: (stage, message, percent) => {
    const now = Date.now();
    set((state) => ({
      progress: {
        ...state.progress,
        stage,
        message,
        percent,
        logs: [...state.progress.logs, { time: now, stage, message }],
      },
    }));
  },

  setResult: (result) => {
    const state = get();
    const historyItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: state.inputText.slice(0, 100),
      result,
      timestamp: Date.now(),
    };
    
    set((s) => ({
      isDetecting: false,
      result,
      progress: {
        ...s.progress,
        stage: 'complete',
        message: '检测完成',
        percent: 100,
        logs: [...s.progress.logs, { time: Date.now(), stage: 'complete', message: '检测完成' }],
      },
      history: [historyItem, ...s.history].slice(0, 20), // 保留最近20条
    }));
  },

  setError: (error) => {
    set((s) => ({
      isDetecting: false,
      error,
      progress: {
        ...s.progress,
        stage: 'error',
        message: error,
        logs: [...s.progress.logs, { time: Date.now(), stage: 'error', message: error }],
      },
    }));
  },

  resetDetection: () => {
    set({
      isDetecting: false,
      progress: initialProgress,
      result: null,
      error: null,
    });
  },

  clearInput: () => {
    set({
      inputText: '',
      inputImage: null,
      imagePreview: '',
    });
  },
}));

// --------------- Auth Store ---------------

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

function getInitialAuthState(): Pick<AuthStore, 'user' | 'token' | 'isAuthenticated'> {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return { user: null, token: null, isAuthenticated: false };
  }

  try {
    const user = JSON.parse(userStr) as User;
    return { user, token, isAuthenticated: true };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { user: null, token: null, isAuthenticated: false };
  }
}

const initialAuthState = getInitialAuthState();

export const useAuthStore = create<AuthStore>((set) => ({
  user: initialAuthState.user,
  token: initialAuthState.token,
  isAuthenticated: initialAuthState.isAuthenticated,

  setAuth: (user: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));

// --------------- Token Validation ---------------

export function validateStoredToken(): boolean {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return false;
  }

  try {
    const user: User = JSON.parse(userStr);
    useAuthStore.getState().setAuth(user, token);
    return true;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
}
