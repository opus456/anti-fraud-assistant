import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// =============== API 网络配置 ===============
// 通过环境变量支持移动端 APK 或自定义后端地址
// 在 .env 文件中可设置 VITE_API_BASE_URL=http://<你电脑IP>:8000/api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
});

// Request interceptor: inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized - only auto logout if not on login page
      if (status === 401) {
        const isLoginPage = window.location.pathname === '/login' || 
                           window.location.pathname === '/register';
        
        if (!isLoginPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        
        // Extract specific error message
        const message = data?.detail || data?.error || data?.message || '认证失败';
        return Promise.reject(new Error(message));
      }

      // 400 Bad Request - return specific error message
      if (status === 400) {
        const message = data?.detail || data?.error || data?.message || '请求格式错误';
        return Promise.reject(new Error(message));
      }

      // Extract error message from response
      const message =
        data?.detail || data?.error || data?.message || `请求失败 (${status})`;
      return Promise.reject(new Error(message));
    }

    if (error.request) {
      return Promise.reject(new Error('网络错误，请检查网络连接'));
    }

    // 如果是 Error 对象，直接返回；否则转换为 Error
    if (error instanceof Error) {
      return Promise.reject(error);
    }

    // 将其他类型的错误转换为 Error 对象
    return Promise.reject(new Error(String(error)));
  }
);

export default api;

// =============== Socket.io Client ===============
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 
                    (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : '');

export const socket: Socket = io(WS_BASE_URL || '/', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export function connectSocket(token: string): void {
  socket.auth = { token };
  socket.connect();
}

export function disconnectSocket(): void {
  socket.disconnect();
}
