import { useEffect, useState } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import api from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

const provinces = [
  '北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '山东',
  '河南', '福建', '湖南', '安徽', '重庆', '陕西', '辽宁', '天津',
  '云南', '河北', '广西', '山西', '贵州', '吉林', '甘肃', '海南',
  '江西', '黑龙江', '内蒙古', '新疆', '宁夏', '西藏', '青海',
];

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nickname: '', age: '', gender: '', occupation: '',
    education: '', province: '', city: '', role_type: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/auth/me');
        const u = data.user || data;
        setForm({
          nickname: u.nickname || '',
          age: u.age?.toString() || '',
          gender: u.gender || '',
          occupation: u.occupation || '',
          education: u.education || '',
          province: u.province || '',
          city: u.city || '',
          role_type: u.role_type || '',
        });
      } catch {
        // Use store data as fallback
        if (user) {
          setForm({
            nickname: user.nickname || '',
            age: user.age?.toString() || '',
            gender: user.gender || '',
            occupation: user.occupation || '',
            education: user.education || '',
            province: user.province || '',
            city: user.city || '',
            role_type: user.role_type || '',
          });
        }
      }
    };
    fetchProfile();
  }, [user]);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { ...form };
      payload.age = form.age ? parseInt(form.age, 10) : null;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });

      const { data } = await api.put('/auth/profile', payload);
      updateUser(data.user || data);
      toast.success('个人信息已更新');
    } catch (err: any) {
      toast.error(err.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <User className="w-6 h-6 text-primary-600" /> 我的画像
      </h1>

      {/* User info card */}
      {user && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {(user.nickname || user.username)?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.nickname || user.username}</h2>
              <p className="text-primary-200 text-sm">{user.email}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-primary-200">
                <span>角色: {user.role}</span>
                <span>检测: {user.total_detections} 次</span>
                <span>命中: {user.fraud_hits} 次</span>
                <span>风险分: {user.risk_score}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-800 mb-4">编辑个人信息</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
            <input type="text" value={form.nickname} onChange={(e) => update('nickname', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="显示名称" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
              <input type="number" value={form.age} onChange={(e) => update('age', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="年龄" />
            </div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">职业</label>
            <input type="text" value={form.occupation} onChange={(e) => update('occupation', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="您的职业" />
          </div>

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="城市" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? '保存中...' : '保存修改'}
          </button>
        </form>
      </div>
    </div>
  );
}
