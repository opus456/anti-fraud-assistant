/**
 * 用户画像页面
 */
import { useState } from 'react';
import { User, Save, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuthStore } from '../store';

const roleLabels: Record<string, string> = {
  elder: '老年人', child: '儿童/青少年', adult: '成年人',
  student: '学生', finance: '财会人员', other: '其他'
};

const genderLabels: Record<string, string> = { male: '男', female: '女', other: '其他' };

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nickname: user?.nickname || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || 'other',
    role_type: user?.role_type || 'adult',
    occupation: user?.occupation || '',
    education: user?.education || '',
    province: user?.province || '',
    city: user?.city || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', {
        ...form,
        age: form.age ? parseInt(form.age) : null,
      });
      updateUser(data);
      setEditing(false);
      toast.success('画像已更新');
    } catch {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return (
    <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-2xl border border-gray-100">
      <LogIn className="w-12 h-12 text-primary-300 mx-auto mb-3" />
      <p className="text-gray-600 font-medium">需要登录后查看个人画像</p>
      <Link to="/login" className="inline-block mt-4 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition">
        去登录
      </Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-0">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <User className="w-7 h-7 text-primary-500" />
        我的画像
      </h1>

      {/* 风险画像卡 */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {user.nickname?.[0] || user.username[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.nickname || user.username}</h2>
            <p className="text-blue-200 text-sm">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{(user.risk_score * 100).toFixed(0)}</p>
            <p className="text-xs text-blue-200">风险指数</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{user.total_detections}</p>
            <p className="text-xs text-blue-200">检测次数</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{user.fraud_hits}</p>
            <p className="text-xs text-blue-200">检出诈骗</p>
          </div>
        </div>
      </div>

      {/* 个人信息 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-900">基本信息</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-sm text-primary-500 hover:underline">
              编辑
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 text-sm text-white bg-primary-500 px-4 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {saving ? '保存中...' : '保存'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: '昵称', field: 'nickname', type: 'text' },
            { label: '年龄', field: 'age', type: 'number' },
            { label: '性别', field: 'gender', type: 'select', options: genderLabels },
            { label: '身份类型', field: 'role_type', type: 'select', options: roleLabels },
            { label: '职业', field: 'occupation', type: 'text' },
            { label: '学历', field: 'education', type: 'text' },
            { label: '省份', field: 'province', type: 'text' },
            { label: '城市', field: 'city', type: 'text' },
          ].map((item) => (
            <div key={item.field}>
              <label className="block text-sm font-medium text-gray-600 mb-1">{item.label}</label>
              {!editing ? (
                <p className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800 text-sm">
                  {item.type === 'select'
                    ? (item.options as Record<string, string>)[(form as any)[item.field]] || '-'
                    : (form as any)[item.field] || '-'}
                </p>
              ) : item.type === 'select' ? (
                <select
                  value={(form as any)[item.field]}
                  onChange={(e) => setForm({ ...form, [item.field]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  {Object.entries(item.options as Record<string, string>).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={item.type}
                  value={(form as any)[item.field]}
                  onChange={(e) => setForm({ ...form, [item.field]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
