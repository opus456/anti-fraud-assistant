import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// --------------- Axios Instance ---------------

const api = axios.create({
  baseURL: '/api',
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

      // 401 Unauthorized - auto logout
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }

      // Extract error message from response
      const message =
        data?.error || data?.message || `请求失败 (${status})`;
      return Promise.reject(new Error(message));
    }

    if (error.request) {
      return Promise.reject(new Error('网络错误，请检查网络连接'));
    }

    return Promise.reject(error);
  }
);

export default api;

// --------------- Socket.io Client ---------------

export const socket: Socket = io('/', {
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
