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
