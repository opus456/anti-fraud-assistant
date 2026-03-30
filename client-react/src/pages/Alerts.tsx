import { useState, useEffect } from 'react';
import { Bell, Filter, CheckCircle, AlertTriangle, ShieldCheck, Info, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

interface Alert {
  id: number;
  title: string;
  description: string;
  suggestion: string;
  alert_type: string;
  risk_level: number;
  fraud_type: string | null;
  guardian_notified: boolean;
  is_resolved: boolean;
  created_at: string;
}

const riskLevelConfig: Record<number, { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
  0: { label: '安全', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: ShieldCheck },
  1: { label: '低风险', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Info },
  2: { label: '中风险', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle },
  3: { label: '高风险', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: ShieldAlert },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [filterResolved, setFilterResolved] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (filterResolved !== null) params.is_resolved = filterResolved;
      const { data } = await api.get('/alerts/', { params });
      const list = Array.isArray(data) ? data : data.alerts || data.items || [];
      setAlerts(list);
      setTotal(data.total ?? (list.length === pageSize ? page * pageSize + 1 : (page - 1) * pageSize + list.length));
    } catch (err: any) {
      toast.error(err.message || '获取预警列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, filterLevel, filterResolved]);

  const handleResolve = async (alertId: number) => {
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, is_resolved: true } : a));
      toast.success('已标记为已处理');
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Bell className="w-6 h-6 text-primary-600" /> 预警中心
      </h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 mr-2">风险等级:</span>
          <button onClick={() => { setFilterLevel(null); setPage(1); }}
            className={`px-3 py-1 text-xs rounded-full border ${filterLevel === null ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}>
            全部
          </button>
          {[0, 1, 2, 3].map((level) => {
            const cfg = riskLevelConfig[level];
            return (
              <button key={level} onClick={() => { setFilterLevel(level); setPage(1); }}
                className={`px-3 py-1 text-xs rounded-full border ${filterLevel === level ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                {cfg.label}
              </button>
            );
          })}

          <span className="mx-2 text-gray-300">|</span>
          <span className="text-sm text-gray-500 mr-2">状态:</span>
          <button onClick={() => { setFilterResolved(null); setPage(1); }}
            className={`px-3 py-1 text-xs rounded-full border ${filterResolved === null ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}>
            全部
          </button>
          <button onClick={() => { setFilterResolved(false); setPage(1); }}
            className={`px-3 py-1 text-xs rounded-full border ${filterResolved === false ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}>
            未处理
          </button>
          <button onClick={() => { setFilterResolved(true); setPage(1); }}
            className={`px-3 py-1 text-xs rounded-full border ${filterResolved === true ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'}`}>
            已处理
          </button>
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">暂无预警记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const cfg = riskLevelConfig[alert.risk_level] || riskLevelConfig[3];
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className={`rounded-xl border p-4 ${alert.is_resolved ? 'bg-gray-50 border-gray-200 opacity-70' : cfg.bg}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    alert.is_resolved ? 'bg-gray-200' : `${cfg.color}`
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-medium ${alert.is_resolved ? 'text-gray-500' : 'text-gray-800'}`}>
                        {alert.title || alert.fraud_type || '预警信息'}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        alert.is_resolved ? 'bg-gray-200 text-gray-500' : `${cfg.color} bg-white/50`
                      }`}>
                        {cfg.label}
                      </span>
                      {alert.is_resolved && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> 已处理
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${alert.is_resolved ? 'text-gray-400' : 'text-gray-600'}`}>
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                      {alert.fraud_type && <span>类型: {alert.fraud_type}</span>}
                    </div>
                  </div>
                  {!alert.is_resolved && (
                    <button onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700 flex items-center gap-1 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> 处理
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">第 {page} / {totalPages} 页</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
