import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogIn, Eye, EyeOff, ShieldAlert, Lock, User, AlertTriangle, XCircle } from 'lucide-react';
import api from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

type LoginMode = 'user' | 'guardian';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<LoginMode>('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.user, data.access_token);
      toast.success('🎉 登录成功，欢迎回来！');
      if (mode === 'guardian' && (data.user.role === 'guardian' || data.user.role === 'admin')) {
        navigate('/guardian-dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const errorMsg = err.message || '登录失败，请检查用户名和密码';
      setError(errorMsg);
      triggerShake();
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-primary-950">
      {/* 左侧装饰区域 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* 背景网格 */}
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        
        {/* 渐变叠加 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-950 to-danger-900/30" />
        
        {/* 装饰性圆环 */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 border border-primary-700/20 rounded-full" />
        <div className="absolute top-1/3 -left-10 w-72 h-72 border border-danger-500/10 rounded-full" />
        <div className="absolute bottom-1/4 right-10 w-64 h-64 border border-accent-500/10 rounded-full" />
        
        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-center px-16 py-12">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-gradient-to-br from-danger-500 to-danger-600 rounded-2xl flex items-center justify-center shadow-lg shadow-danger-500/30">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">国家反诈中心</h1>
              <p className="text-primary-400 text-sm">智能防护系统</p>
            </div>
          </div>
          
          {/* 标语 */}
          <div className="space-y-6 mb-16">
            <h2 className="text-4xl font-bold text-white leading-tight">
              AI 智能守护<br />
              <span className="text-danger-400">全民反诈</span>
            </h2>
            <p className="text-primary-300 text-lg leading-relaxed max-w-md">
              基于先进的人工智能技术，实时识别各类电信网络诈骗，
              为您和家人筑起安全防线。
            </p>
          </div>
          
          {/* 统计数据 */}
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: '已拦截诈骗', value: '1.2M+', suffix: '次' },
              { label: '保护用户', value: '500K+', suffix: '人' },
              { label: '识别准确率', value: '99.2', suffix: '%' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white">
                  {stat.value}
                  <span className="text-danger-400 text-lg">{stat.suffix}</span>
                </div>
                <div className="text-primary-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* 底部警示 */}
          <div className="mt-auto pt-12">
            <div className="flex items-start gap-3 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-primary-200">
                <span className="text-danger-400 font-medium">安全提醒：</span>
                公检法机关不会通过电话、网络办案，更不会要求转账！
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-danger-500 to-danger-600 rounded-2xl mb-4 shadow-lg shadow-danger-500/30">
              <ShieldAlert className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">反诈智能助手</h1>
            <p className="text-primary-400 text-sm mt-1">AI 守护您的安全</p>
          </div>

          {/* 登录卡片 */}
          <div className={`bg-white rounded-3xl shadow-2xl p-8 lg:p-10 transition-transform ${shake ? 'animate-shake' : ''}`}>
            {/* 标题 */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">欢迎登录</h2>
              <p className="text-gray-500 mt-2">登录后开启智能反诈防护</p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-slide-down">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-700">登录失败</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            )}
            
            {/* 模式切换 */}
            <div className="flex bg-slate-100 rounded-xl p-1.5 mb-8">
              {([
                { key: 'user', label: '普通用户', icon: User },
                { key: 'guardian', label: '监护人', icon: Shield },
              ] as const).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    mode === m.key 
                      ? 'bg-white text-primary-700 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(null); }}
                    className={`input pl-12 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    placeholder="请输入用户名"
                  />
                </div>
              </div>
              
              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    className={`input pl-12 pr-12 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    placeholder="请输入密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 
                         text-white rounded-xl font-semibold flex items-center justify-center gap-2 
                         shadow-lg shadow-primary-900/25 hover:shadow-xl hover:shadow-primary-900/30
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    安全登录
                  </>
                )}
              </button>
            </form>

            {/* 注册链接 */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-gray-500">
                还没有账号？
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium ml-1 hover:underline">
                  立即注册
                </Link>
              </p>
            </div>
            
            {/* 安全提示 */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              <span>您的信息将被安全加密保护</span>
            </div>
          </div>
          
          {/* 底部热线 */}
          <div className="mt-6 text-center">
            <p className="text-primary-400 text-sm">
              全国反诈热线：<span className="text-danger-400 font-bold">96110</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
