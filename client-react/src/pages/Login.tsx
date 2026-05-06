import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import shieldBg from '../assets/shield-bg.png';
import logo from '../assets/logo_new.png';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      const msg = '请输入用户名和密码';
      setError(msg);
      toast.error(msg);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password,
      });
      
      const { access_token, user } = response.data;
      setAuth(user, access_token);

      toast.success(`欢迎回来，${user.nickname || user.username}！`);
      
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = '登录失败，请稍后重试';
      
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
        
        const msg = err.message.toLowerCase();
        if (msg.includes('用户名或密码错误')) {
          errorMessage = '用户名或密码错误，请检查后重试';
        } else if (msg.includes('账户已被禁用') || msg.includes('disabled')) {
          errorMessage = '您的账户已被禁用，请联系管理员';
        } else if (msg.includes('网络') || msg.includes('连接')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        }
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as Record<string, any>;
        errorMessage = errorObj.message || errorObj.detail || String(err);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Clear password on error for security
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ====== 左侧：全屏沉浸式盾牌背景 (60%) ====== */}
      <div className="hidden lg:block lg:w-[60%] relative bg-slate-50">
        {/* 巨幅盾牌背景 */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <img
            src={shieldBg}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.85) saturate(1.1)' }}
          />
          {/* 叠加渐变：右侧淡出到边界 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-stone-900/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-stone-900/30" />
        </motion.div>

        {/* 品牌信息悬浮在背景上 */}
        <div className="absolute inset-0 flex flex-col justify-end p-12 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
              聆析护盾
            </h1>
            <h1 className="text-2xl xl:text-3xl font-bold text-white mb-4 leading-tight">
              让每一次诈骗都被防御, 每一次守护都被看见
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              ai守护, 让诈骗无所遁形 · 全链路感知 · 智能决策 · 实时干预
            </p>
            <div className="flex gap-3">
              {['文本分析', '语音检测', '图片识别', '诈骗预警'].map((tag, i) => (
                <motion.span
                  key={tag}
                  className="px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 左下角水印 */}
        <div className="absolute bottom-6 left-12 text-white/20 text-xs z-10">
          © 2026 聆析护盾 · Powered by AI
        </div>
      </div>

      {/* ====== 右侧：纯净登录区 (40%) ====== */}
      <div className="w-full lg:w-[40%] flex items-center justify-center bg-white relative">
        {/* 移动端背景 (lg 以下) */}
        <div className="absolute inset-0 lg:hidden">
          <img src={shieldBg} alt="" className="w-full h-full object-cover opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 to-white" />
        </div>

        <motion.div
          className="w-full max-w-sm px-6 sm:px-8 relative z-10"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Logo mark */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="logo-mark logo-mark-lg">
                <img src={logo} alt="聆析护盾" className="logo-mark-img w-full h-full object-contain" />
              </div>
              <div className="leading-none">
                <span className="text-xl font-black text-slate-900 tracking-tight">聆析护盾</span>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Fraud Defense Console</div>
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              识破每一次骗局
            </h2>
            <p className="text-slate-500 text-sm">
              登录以继续守护您和家人的安全
            </p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <motion.div
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              >{error}</motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">用户名</label>
              <input
                type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="请输入用户名"
                autoComplete="username" disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  placeholder="请输入密码"
                  autoComplete="current-password" disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 hover:shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  登录中...
                </span>
              ) : '登录'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/register" className="text-accent-600 hover:text-accent-700 transition-colors font-medium">注册新账户</Link>
            <a href="#" className="text-slate-500 hover:text-slate-500 transition-colors">忘记密码？</a>
          </div>

          {/* 底部分割 */}
          <div className="mt-10 pt-6 border-t border-slate-200 text-center">
            <p className="text-slate-500 text-xs">AI-Driven · Multimodal · 360° Guardian</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
