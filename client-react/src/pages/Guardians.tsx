import { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Loader2, Shield } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

interface Guardian {
  id: number;
  guardian_id: number;
  guardian_username: string;
  guardian_nickname: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
}

export default function Guardians() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [bindUsername, setBindUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);

  const fetchGuardians = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/guardians/');
      const list = Array.isArray(data) ? data : data.guardians || [];
      setGuardians(list);
    } catch (err: any) {
      toast.error(err.message || '获取监护人列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
  }, []);

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindUsername.trim()) {
      toast.error('请输入监护人用户名');
      return;
    }
    setBindLoading(true);
    try {
      await api.post('/guardians/bind', { guardian_username: bindUsername.trim() });
      toast.success('绑定成功');
      setBindUsername('');
      fetchGuardians();
    } catch (err: any) {
      toast.error(err.message || '绑定失败');
    } finally {
      setBindLoading(false);
    }
  };

  const handleUnbind = async (guardianId: number, name: string) => {
    if (!confirm(`确定要解绑监护人 "${name}" 吗？`)) return;
    try {
      await api.delete(`/guardians/${guardianId}`);
      toast.success('已解绑');
      setGuardians((prev) => prev.filter((g) => g.id !== guardianId));
    } catch (err: any) {
      toast.error(err.message || '解绑失败');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Users className="w-6 h-6 text-primary-600" /> 监护人管理
      </h1>

      {/* Info banner */}
      <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-accent-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-blue-800 font-medium">什么是监护人？</p>
            <p className="text-xs text-accent-600 mt-1">
              绑定监护人后，当系统检测到高风险诈骗信息时，会实时通知您的监护人，
              帮助您避免受骗。适合为老人、学生等易受骗群体设置。
            </p>
          </div>
        </div>
      </div>

      {/* Bind form */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-600" /> 绑定监护人
        </h3>
        <form onSubmit={handleBind} className="flex gap-3">
          <input
            type="text"
            value={bindUsername}
            onChange={(e) => setBindUsername(e.target.value)}
            placeholder="输入监护人的用户名"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button type="submit" disabled={bindLoading}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 shrink-0">
            {bindLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            绑定
          </button>
        </form>
      </div>

      {/* Guardian list */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-800 mb-4">
          我的监护人 ({guardians.length})
        </h3>

        {loading ? (
          <div className="text-center py-8 text-slate-500">加载中...</div>
        ) : guardians.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">暂未绑定监护人</p>
            <p className="text-slate-500 text-xs mt-1">在上方输入监护人用户名进行绑定</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guardians.map((g) => (
              <div key={g.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-200">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg shrink-0">
                  {(g.guardian_nickname || g.guardian_username)?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{g.guardian_nickname || g.guardian_username}</p>
                  <p className="text-xs text-slate-500">关系: {g.relationship || '未设置'} {g.is_primary ? '(主监护人)' : ''}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    绑定时间: {new Date(g.created_at).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => handleUnbind(g.id, g.guardian_nickname || g.guardian_username)}
                  className="px-3 py-1.5 text-sm text-rose-600 bg-rose-50 hover:bg-rose-50 rounded-lg flex items-center gap-1 shrink-0">
                  <UserMinus className="w-3.5 h-3.5" /> 解绑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
