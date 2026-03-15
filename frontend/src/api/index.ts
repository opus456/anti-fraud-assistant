/**
 * Axios HTTP 客户端配置
 * 统一管理 API 请求、token 注入和错误处理
 */
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：注入 JWT 令牌
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 防止重复弹出「登录已过期」
let hasShown401Toast = false;

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/me');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // token 无效/过期 → 同步清除 Zustand + localStorage
      useAuthStore.getState().logout();
      if (!hasShown401Toast) {
        hasShown401Toast = true;
        toast.error('登录已过期，部分功能需要重新登录');
        setTimeout(() => { hasShown401Toast = false; }, 5000);
      }
    } else if (error.response?.data?.detail) {
      toast.error(
        typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : Array.isArray(error.response.data.detail)
            ? error.response.data.detail.map((e: any) => e.msg).join('; ')
            : '请求失败'
      );
    } else if (!isAuthEndpoint) {
      toast.error('网络请求失败，请稍后重试');
    }
    return Promise.reject(error);
  }
);

export default api;
