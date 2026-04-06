import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../api';
import { useAuthStore } from '../store';
import { useModeStore } from '../store/modeStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { setMode } = useModeStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 调用真实的登录 API
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password,
      });
      
      const { access_token, user } = response.data;
      
      // 使用 Zustand store 保存认证状态
      setAuth(user, access_token);
      
      // 根据用户身份类型自动设置模式
      if (user.role_type === 'elderly') {
        setMode('elder');
        toast.success(`欢迎回来，${user.nickname || user.username}！已为您切换到长辈模式`);
      } else if (user.role_type === 'student') {
        setMode('minor');
        toast.success(`欢迎回来，${user.nickname || user.username}！已为您切换到青少年模式`);
      } else {
        setMode('standard');
        toast.success(`欢迎回来，${user.nickname || user.username}！`);
      }
      
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败，请稍后重试';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-sky-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-200/40 rounded-full blur-3xl" />
      </div>
      
      <motion.div 
        className="w-full max-w-sm sm:max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-btn"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <ShieldCheckIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            反诈守护助手
          </h1>
          <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">AI 驱动的安全防护</p>
        </div>

        {/* 登录表单 */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <div className="input-group">
              <label className="input-label">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="请输入用户名"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div className="input-group">
              <label className="input-label">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full h-12 text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </span>
              ) : '登录'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link 
              to="/register" 
              className="text-sky-600 hover:text-sky-700 transition-colors font-medium"
            >
              注册新账户
            </Link>
            <a 
              href="#" 
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              忘记密码？
            </a>
          </div>
        </motion.div>

        {/* 底部 */}
        <p className="text-center text-slate-400 text-sm mt-8">
          © 2024 反诈守护助手 · 保护您的每一次通话
        </p>
      </motion.div>
    </div>
  );
}
