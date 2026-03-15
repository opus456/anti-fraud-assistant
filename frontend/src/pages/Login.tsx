/**
 * 登录页面
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuthStore } from '../store';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const mode = searchParams.get('mode') === 'guardian' ? 'guardian' : 'user';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error('请填写用户名和密码'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.user, data.access_token);
      toast.success('登录成功！');
      navigate(mode === 'guardian' ? '/guardian-portal' : '/');
    } catch (err: any) {
      // 拦截器已弹出toast，此处无需重复
      if (!err?.response) {
        toast.error('无法连接服务器，请检查网络');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger-500 shadow-lg mb-4">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">反诈智能助手</h1>
          <p className="text-gray-400 mt-2">AI守护您的安全 · 全民反诈</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">欢迎回来</h2>

          <div className="grid grid-cols-2 gap-2 mb-5 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSearchParams({ mode: 'user' })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'user' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}
            >
              用户端登录
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({ mode: 'guardian' })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'guardian' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'}`}
            >
              监护端登录
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition pr-12"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : (mode === 'guardian' ? '进入监护端' : '进入用户端')}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            没有账号？
            <Link to={mode === 'guardian' ? '/register?mode=guardian' : '/register'} className="text-primary-500 hover:underline ml-1">
              立即注册
            </Link>
          </p>
        </form>

        {/* 底部标语 */}
        <p className="text-center text-gray-500 mt-6 text-sm">
          天下无诈 · 全民守护 · 96110反诈热线
        </p>
      </div>
    </div>
  );
}
