import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogIn, Eye, EyeOff } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.user, data.access_token);
      toast.success('登录成功');
      if (mode === 'guardian' && (data.user.role === 'guardian' || data.user.role === 'admin')) {
        navigate('/guardian-dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">反诈智能助手</h1>
          <p className="text-primary-300 text-sm mt-1">AI 守护您的安全</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            {(['user', 'guardian'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === m ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                {m === 'user' ? '普通用户' : '监护人'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none pr-10"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            还没有账号？
            <Link to="/register" className="text-primary-600 hover:underline ml-1">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
