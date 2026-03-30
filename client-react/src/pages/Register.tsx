import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, UserPlus, ArrowLeft, ArrowRight } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const provinces = [
  '北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '山东',
  '河南', '福建', '湖南', '安徽', '重庆', '陕西', '辽宁', '天津',
  '云南', '河北', '广西', '山西', '贵州', '吉林', '甘肃', '海南',
  '江西', '黑龙江', '内蒙古', '新疆', '宁夏', '西藏', '青海',
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', role: 'user',
    nickname: '', age: '', gender: '', role_type: '', occupation: '',
    education: '', province: '', city: '',
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const validateStep1 = () => {
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('请填写所有必填项');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('两次密码输入不一致');
      return false;
    }
    if (form.password.length < 6) {
      toast.error('密码长度至少6位');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        username: form.username, email: form.email, password: form.password, role: form.role,
        nickname: form.nickname || form.username,
        gender: form.gender || undefined,
        role_type: form.role_type || undefined,
        occupation: form.occupation || undefined,
        education: form.education || undefined,
        province: form.province || undefined,
        city: form.city || undefined,
      };
      if (form.age) payload.age = parseInt(form.age, 10);

      await api.post('/auth/register', payload);
      toast.success('注册成功，请登录');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">创建账号</h1>
          <p className="text-primary-300 text-sm mt-1">第 {step} 步，共 2 步</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Progress bar */}
          <div className="flex gap-2 mb-6">
            <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-primary-500' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200'}`} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <InputField label="用户名 *" value={form.username} onChange={(v) => update('username', v)} placeholder="请输入用户名" />
                <InputField label="邮箱 *" value={form.email} onChange={(v) => update('email', v)} placeholder="请输入邮箱" type="email" />
                <InputField label="密码 *" value={form.password} onChange={(v) => update('password', v)} placeholder="至少6位" type="password" />
                <InputField label="确认密码 *" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} placeholder="再次输入密码" type="password" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <select value={form.role} onChange={(e) => update('role', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="user">普通用户</option>
                    <option value="guardian">监护人</option>
                  </select>
                </div>
                <button type="button" onClick={() => validateStep1() && setStep(2)}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                  下一步 <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <InputField label="昵称" value={form.nickname} onChange={(v) => update('nickname', v)} placeholder="显示名称" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="年龄" value={form.age} onChange={(v) => update('age', v)} placeholder="年龄" type="number" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                    <select value={form.gender} onChange={(e) => update('gender', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                      <option value="">选择性别</option>
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                </div>
                <InputField label="职业" value={form.occupation} onChange={(v) => update('occupation', v)} placeholder="您的职业" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学历</label>
                  <select value={form.education} onChange={(e) => update('education', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="">选择学历</option>
                    <option value="初中及以下">初中及以下</option>
                    <option value="高中">高中</option>
                    <option value="大专">大专</option>
                    <option value="本科">本科</option>
                    <option value="硕士">硕士</option>
                    <option value="博士">博士</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">身份类型</label>
                  <select value={form.role_type} onChange={(e) => update('role_type', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="">选择身份</option>
                    <option value="elderly">老年人</option>
                    <option value="student">学生</option>
                    <option value="worker">上班族</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">省份</label>
                    <select value={form.province} onChange={(e) => update('province', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                      <option value="">选择省份</option>
                      {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <InputField label="城市" value={form.city} onChange={(v) => update('city', v)} placeholder="城市" />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50">
                    <ArrowLeft className="w-4 h-4" /> 上一步
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    <UserPlus className="w-4 h-4" /> {loading ? '注册中...' : '注册'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            已有账号？<Link to="/login" className="text-primary-600 hover:underline ml-1">去登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        placeholder={placeholder} />
    </div>
  );
}
