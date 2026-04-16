import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import api from '../api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import shieldBg from '../assets/shield-bg.png';
import logo from '../assets/logo.png';

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
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) { toast.error('请填写所有必填项'); return false; }
    if (form.username.trim().length < 2) { toast.error('用户名长度至少2个字符'); return false; }
    if (form.password !== form.confirmPassword) { toast.error('两次密码输入不一致'); return false; }
    if (form.password.length < 6) { toast.error('密码长度至少6位'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        nickname: (form.nickname || form.username).trim(),
        gender: form.gender || 'other',
        role_type: form.role_type || 'adult',
        occupation: form.occupation || '',
        education: form.education || '',
        province: form.province || '',
        city: form.city || '',
      };
      
      if (form.age) payload.age = parseInt(form.age, 10);
      
      const response = await api.post('/auth/register', payload);
      
      if (response.data) {
        toast.success('注册成功，请登录');
        navigate('/login');
      }
    } catch (err: unknown) {
      let errorMessage = '注册失败，请稍后重试';
      
      // 首先，尝试从 Error 对象获取消息
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
        
        // 根据错误信息内容进行更细致的分类
        const msg = err.message.toLowerCase();
        if (msg.includes('用户名')) {
          errorMessage = '用户名已被注册或格式无效';
        } else if (msg.includes('邮箱')) {
          errorMessage = '邮箱已被注册或格式无效';
        } else if (msg.includes('密码')) {
          errorMessage = '密码格式不符合要求';
        } else if (msg.includes('网络') || msg.includes('连接')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (msg.includes('422') || msg.includes('unprocessable')) {
          errorMessage = '提交的数据格式有误，请检查后重试';
        }
      } else if (typeof err === 'object' && err !== null) {
        // 如果错误对象不是 Error 实例，尝试提取其他属性
        const errorObj = err as Record<string, any>;
        errorMessage = errorObj.message || errorObj.detail || String(err);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/10 transition-all";
  const selectClass = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/10 transition-all appearance-none";

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* 左侧沉浸式背景 */}
      <div className="hidden lg:block lg:w-[55%] relative bg-[#0a1628]">
        <motion.div className="absolute inset-0" initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.5 }}>
          <img src={shieldBg} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.6) saturate(1.3)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a1628]/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/60 via-transparent to-[#0a1628]/40" />
        </motion.div>
        <div className="absolute inset-0 flex flex-col justify-end p-12 z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <h1 className="text-4xl font-bold text-white mb-4">加入御见行列</h1>
            <p className="text-white/50 text-lg max-w-md">注册成为守护者，让 AI 为您和家人构建全方位反诈防线，识破每一次骗局</p>
          </motion.div>
        </div>
        <div className="absolute bottom-6 left-12 text-white/20 text-xs z-10">© 2026 御见 · 识破每一次骗局</div>
      </div>

      {/* 右侧注册表单 */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-white relative">
        <div className="absolute inset-0 lg:hidden">
          <img src={shieldBg} alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/95 to-white/98" />
        </div>

        <motion.div className="w-full max-w-md px-6 sm:px-8 py-8 relative z-10"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
                <img src={logo} alt="御见" className="w-16 h-16 rounded-xl object-cover shadow-lg shadow-red-500/20 logo-img" />
              <span className="text-lg font-bold text-slate-800">创建账号</span>
            </div>
            {/* 步骤指示器 */}
            <div className="flex items-center gap-0 mb-2">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
                  {s < 2 && <div className={`w-16 h-0.5 transition-colors ${step >= 2 ? 'bg-[#007AFF]' : 'bg-slate-200'}`} />}
                </div>
              ))}
              <span className="ml-3 text-sm text-slate-400">第 {step}/2 步</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">用户名 *</label><input type="text" value={form.username} onChange={e => update('username', e.target.value)} className={inputClass} placeholder="请输入用户名" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱 *</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputClass} placeholder="请输入邮箱" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">密码 *</label><input type="password" value={form.password} onChange={e => update('password', e.target.value)} className={inputClass} placeholder="至少6位" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">确认密码 *</label><input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} className={inputClass} placeholder="再次输入密码" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">角色</label><select value={form.role} onChange={e => update('role', e.target.value)} className={selectClass}><option value="user">普通用户</option><option value="guardian">监护人</option></select></div>
                <button type="button" onClick={() => validateStep1() && setStep(2)} className="w-full py-3.5 rounded-xl bg-[#007AFF] hover:bg-[#0063D1] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2">下一步 <ArrowRightIcon className="w-4 h-4" /></button>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div className="space-y-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">昵称</label><input type="text" value={form.nickname} onChange={e => update('nickname', e.target.value)} className={inputClass} placeholder="显示名称" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">年龄</label><input type="number" value={form.age} onChange={e => update('age', e.target.value)} className={inputClass} placeholder="年龄" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">性别</label><select value={form.gender} onChange={e => update('gender', e.target.value)} className={selectClass}><option value="">选择</option><option value="male">男</option><option value="female">女</option><option value="other">其他</option></select></div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">身份类型</label><select value={form.role_type} onChange={e => update('role_type', e.target.value)} className={selectClass}><option value="">选择身份</option><option value="elderly">老年人</option><option value="student">学生</option><option value="worker">上班族</option><option value="other">其他</option></select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">职业</label><input type="text" value={form.occupation} onChange={e => update('occupation', e.target.value)} className={inputClass} placeholder="您的职业" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">省份</label><select value={form.province} onChange={e => update('province', e.target.value)} className={selectClass}><option value="">选择省份</option>{provinces.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1.5">城市</label><input type="text" value={form.city} onChange={e => update('city', e.target.value)} className={inputClass} placeholder="城市" /></div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><ArrowLeftIcon className="w-4 h-4" />上一步</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-[#007AFF] hover:bg-[#0063D1] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"><UserPlusIcon className="w-4 h-4" />{loading ? '注册中...' : '注册'}</button>
                </div>
              </motion.div>
            )}
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">已有账号？<Link to="/login" className="text-[#007AFF] hover:text-[#0063D1] ml-1 font-medium transition-colors">去登录</Link></p>
        </motion.div>
      </div>
    </div>
  );
}
