/**
 * 注册页面 - 包含用户画像收集
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuthStore } from '../store';

const roleOptions = [
  { value: 'elder', label: '老年人(60+)', desc: '退休/居家老年人' },
  { value: 'child', label: '儿童/青少年', desc: '18岁以下' },
  { value: 'student', label: '学生', desc: '大中专在校学生' },
  { value: 'adult', label: '成年人', desc: '18-60岁成年人' },
  { value: 'finance', label: '财会人员', desc: '财务/会计相关' },
  { value: 'other', label: '其他', desc: '' },
];

const provinces = [
  '北京', '上海', '广东', '浙江', '江苏', '山东', '河南', '四川',
  '湖北', '湖南', '福建', '河北', '安徽', '辽宁', '陕西', '江西',
  '广西', '重庆', '天津', '云南', '山西', '贵州', '吉林', '黑龙江',
  '甘肃', '内蒙古', '新疆', '海南', '宁夏', '青海', '西藏',
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const mode = searchParams.get('mode') === 'guardian' ? 'guardian' : 'user';

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPwd: '',
    nickname: '', age: '', gender: 'other', role_type: 'adult',
    occupation: '', education: '', province: '', city: ''
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (form.password !== form.confirmPwd) { toast.error('两次密码不一致'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        ...form,
        age: form.age ? parseInt(form.age) : null,
        confirmPwd: undefined,
      });
      setAuth(data.user, data.access_token);
      toast.success(mode === 'guardian' ? '监护端注册成功！' : '注册成功！欢迎使用反诈智能助手');
      navigate(mode === 'guardian' ? '/guardian-portal' : '/');
    } catch (err: any) {
      if (!err?.response) {
        toast.error('无法连接服务器，请检查网络');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-danger-500 shadow-lg mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">注册账号</h1>
          <p className="text-gray-400 mt-1 text-sm">完善信息帮助我们为您提供个性化防护</p>
        </div>

        {/* 步骤指示 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-danger-500' : 'w-2 bg-gray-600'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="grid grid-cols-2 gap-2 mb-5 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSearchParams({ mode: 'user' })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'user' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}
            >
              用户端注册
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({ mode: 'guardian' })}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'guardian' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'}`}
            >
              监护端注册
            </button>
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名 *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="3-50个字符"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="至少6位"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">确认密码 *</label>
                <input
                  type="password"
                  value={form.confirmPwd}
                  onChange={(e) => update('confirmPwd', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="再次输入密码"
                />
              </div>
              <button
                onClick={() => {
                  if (!form.username || !form.email || !form.password) {
                    toast.error('请填写必填项'); return;
                  }
                  if (form.password.length < 6) {
                    toast.error('密码至少6位'); return;
                  }
                  setStep(2);
                }}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                下一步：用户画像 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">用户画像</h3>
              <p className="text-sm text-gray-500 mb-4">这些信息将帮助AI为您提供更精准的反诈防护</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                  <input
                    type="text"
                    value={form.nickname}
                    onChange={(e) => update('nickname', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => update('age', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                    placeholder="如：25"
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                <div className="flex gap-3">
                  {[{ v: 'male', l: '男' }, { v: 'female', l: '女' }, { v: 'other', l: '不便透露' }].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => update('gender', g.v)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors
                        ${form.gender === g.v ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-600 hover:border-primary-300'}`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">身份类型</label>
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => update('role_type', r.value)}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors
                        ${form.role_type === r.value ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-600 hover:border-primary-300'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">职业</label>
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={(e) => update('occupation', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                      placeholder={mode === 'guardian' ? '如：监护人/家属' : '如：教师'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所在省份</label>
                  <select
                    value={form.province}
                    onChange={(e) => update('province', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">请选择</option>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> 上一步
                </button>
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="flex-1 py-3 bg-danger-500 hover:bg-danger-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? '注册中...' : '完成注册'}
                </button>
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-sm text-gray-500">
            已有账号？
            <Link to={mode === 'guardian' ? '/login?mode=guardian' : '/login'} className="text-primary-500 hover:underline ml-1">直接登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
