import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheckIcon, UserPlusIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
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
      const payload: Record<string, unknown> = {
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '注册失败';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-neon-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-400 to-neon-500 rounded-2xl mb-4 shadow-glow-cyan">
            <ShieldCheckIcon className="w-12 h-12 text-dark" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary text-glow font-tech">创建账号</h1>
          <p className="text-text-muted text-sm mt-2">第 {step} 步，共 2 步</p>
        </div>

        <div className="card">
          {/* Progress bar */}
          <div className="flex gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-gradient-to-r from-cyan-400 to-neon-500 shadow-glow-cyan' : 'bg-white/10'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-gradient-to-r from-cyan-400 to-neon-500 shadow-glow-cyan' : 'bg-white/10'}`} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <InputField label="用户名 *" value={form.username} onChange={(v) => update('username', v)} placeholder="请输入用户名" />
                <InputField label="邮箱 *" value={form.email} onChange={(v) => update('email', v)} placeholder="请输入邮箱" type="email" />
                <InputField label="密码 *" value={form.password} onChange={(v) => update('password', v)} placeholder="至少6位" type="password" />
                <InputField label="确认密码 *" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} placeholder="再次输入密码" type="password" />
                <div className="input-group !mb-0">
                  <label className="input-label">角色</label>
                  <select value={form.role} onChange={(e) => update('role', e.target.value)} className="select">
                    <option value="user">普通用户</option>
                    <option value="guardian">监护人</option>
                  </select>
                </div>
                <button type="button" onClick={() => validateStep1() && setStep(2)}
                  className="btn btn-primary w-full h-12">
                  下一步 <ArrowRightIcon className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <InputField label="昵称" value={form.nickname} onChange={(v) => update('nickname', v)} placeholder="显示名称" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="年龄" value={form.age} onChange={(v) => update('age', v)} placeholder="年龄" type="number" />
                  <div className="input-group !mb-0">
                    <label className="input-label">性别</label>
                    <select value={form.gender} onChange={(e) => update('gender', e.target.value)} className="select">
                      <option value="">选择性别</option>
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                </div>
                <InputField label="职业" value={form.occupation} onChange={(v) => update('occupation', v)} placeholder="您的职业" />
                <div className="input-group !mb-0">
                  <label className="input-label">学历</label>
                  <select value={form.education} onChange={(e) => update('education', e.target.value)} className="select">
                    <option value="">选择学历</option>
                    <option value="初中及以下">初中及以下</option>
                    <option value="高中">高中</option>
                    <option value="大专">大专</option>
                    <option value="本科">本科</option>
                    <option value="硕士">硕士</option>
                    <option value="博士">博士</option>
                  </select>
                </div>
                <div className="input-group !mb-0">
                  <label className="input-label">身份类型</label>
                  <select value={form.role_type} onChange={(e) => update('role_type', e.target.value)} className="select">
                    <option value="">选择身份</option>
                    <option value="elderly">老年人</option>
                    <option value="student">学生</option>
                    <option value="worker">上班族</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group !mb-0">
                    <label className="input-label">省份</label>
                    <select value={form.province} onChange={(e) => update('province', e.target.value)} className="select">
                      <option value="">选择省份</option>
                      {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <InputField label="城市" value={form.city} onChange={(v) => update('city', v)} placeholder="城市" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="btn btn-ghost flex-1 h-12">
                    <ArrowLeftIcon className="w-4 h-4" /> 上一步
                  </button>
                  <button type="submit" disabled={loading}
                    className="btn btn-primary flex-1 h-12 disabled:opacity-50">
                    <UserPlusIcon className="w-4 h-4" /> {loading ? '注册中...' : '注册'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            已有账号？<Link to="/login" className="text-cyan-400 hover:text-cyan-300 ml-1 transition-colors">去登录</Link>
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
    <div className="input-group !mb-0">
      <label className="input-label">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="input"
        placeholder={placeholder} />
    </div>
  );
}
