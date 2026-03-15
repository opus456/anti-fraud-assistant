/**
 * 告警中心页面
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle, AlertTriangle, AlertOctagon, Info, Filter, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuthStore } from '../store';

interface Alert {
  id: number;
  alert_type: string;
  title: string;
  content: string;
  risk_level: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

const riskConfig: Record<string, { color: string; bg: string; icon: typeof Info }> = {
  critical: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertOctagon },
  high: { color: 'text-red-500', bg: 'bg-red-50 border-red-100', icon: AlertOctagon },
  medium: { color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', icon: AlertTriangle },
  low: { color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100', icon: Info },
  safe: { color: 'text-green-500', bg: 'bg-green-50 border-green-100', icon: CheckCircle },
};

const riskLabels: Record<string, string> = { critical: '极高危', high: '高危', medium: '中危', low: '低危', safe: '安全' };
const typeLabels: Record<string, string> = { popup: '弹窗提醒', voice: '语音警告', guardian: '守护者通知', lock: '紧急锁定' };

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('all');
  const [needLogin, setNeedLogin] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const load = async () => {
    if (!isAuthenticated) {
      setNeedLogin(true);
      setLoading(false);
      return;
    }
    try {
      const params: Record<string, any> = {};
      if (filter === 'unresolved') params.unresolved_only = true;
      const { data } = await api.get('/alerts/', { params });
      setAlerts(data);
      setNeedLogin(false);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setNeedLogin(true);
      } else {
        toast.error('加载告警失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, isAuthenticated]);

  const handleResolve = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      toast.success('已处理');
      load();
    } catch {
      toast.error('操作失败');
    }
  };

  const filtered = alerts;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-7 h-7 text-primary-500" />
          告警中心
        </h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'unresolved'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filter === f ? 'bg-white shadow text-primary-600 font-medium' : 'text-gray-500'}`}>
              <Filter className="w-3 h-3 inline mr-1" />
              {f === 'all' ? '全部' : '未处理'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : needLogin ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <LogIn className="w-12 h-12 text-primary-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">需要登录后查看告警记录</p>
          <p className="text-sm text-gray-400 mt-1">登录后可查看和管理您的安全告警</p>
          <Link to="/login" className="inline-block mt-4 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition">
            去登录
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-gray-400">{filter === 'unresolved' ? '无未处理告警' : '暂无告警记录'}</p>
          <p className="text-sm text-gray-400">您的安全状态良好</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const cfg = riskConfig[a.risk_level] || riskConfig.low;
            const Icon = cfg.icon;
            return (
              <div key={a.id}
                className={`rounded-xl border p-5 transition-colors ${a.is_resolved ? 'bg-gray-50 border-gray-100 opacity-70' : cfg.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${a.is_resolved ? 'text-gray-400' : cfg.color}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-semibold ${a.is_resolved ? 'text-gray-500' : 'text-gray-900'}`}>
                          {a.title}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${a.is_resolved ? 'bg-gray-200 text-gray-500' : 'bg-white/60 ' + cfg.color}`}>
                          {riskLabels[a.risk_level] || a.risk_level}
                        </span>
                        <span className="text-xs text-gray-400">
                          {typeLabels[a.alert_type] || a.alert_type}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${a.is_resolved ? 'text-gray-400' : 'text-gray-600'}`}>
                        {a.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(a.created_at).toLocaleString('zh-CN')}
                        {a.is_resolved && a.resolved_at && (
                          <span className="ml-2">· 已于 {new Date(a.resolved_at).toLocaleString('zh-CN')} 处理</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!a.is_resolved && (
                    <button onClick={() => handleResolve(a.id)}
                      className="shrink-0 flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                      <CheckCircle className="w-3.5 h-3.5" /> 标记已处理
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
