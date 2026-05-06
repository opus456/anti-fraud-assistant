import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, ArrowLeft, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import api from '../api';
import toast from 'react-hot-toast';

interface PendingItem {
  id: number;
  title: string;
  content: string;
  source: string;
  fraud_type: string;
  risk_level: number;
  suggestion?: string;
  submitted_by: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [trendData, setTrendData] = useState<{ dates: string[]; counts: number[] }>({ dates: [], counts: [] });
  const [typeData, setTypeData] = useState<{ name: string; value: number }[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendRes, typeRes, pendingRes] = await Promise.allSettled([
        api.get('/statistics/trends'),
        api.get('/statistics/fraud-types'),
        api.get('/alerts/', { params: { page: 1, page_size: 50, is_resolved: false } }),
      ]);

      if (trendRes.status === 'fulfilled') {
        const rows = Array.isArray(trendRes.value.data) ? trendRes.value.data : [];
        setTrendData({
          dates: rows.map((item: any) => item.date),
          counts: rows.map((item: any) => item.total),
        });
      }
      if (typeRes.status === 'fulfilled') {
        const d = Array.isArray(typeRes.value.data) ? typeRes.value.data : [];
        setTypeData(d.map((item: any) => ({ name: item.label || item.fraud_type || '未知', value: item.count || 0 })));
      }
      if (pendingRes.status === 'fulfilled') {
        const alerts = Array.isArray(pendingRes.value.data) ? pendingRes.value.data : [];
        const unknownAlerts = alerts
          .filter((item: any) => !item.fraud_type || item.fraud_type === 'unknown')
          .map((item: any) => ({
            id: item.id,
            title: item.title || '未知风险事件',
            content: item.description || '',
            source: 'risk_alert',
            fraud_type: item.fraud_type || 'unknown',
            risk_level: item.risk_level ?? 2,
            suggestion: item.suggestion || '',
            submitted_by: 'system',
            created_at: item.created_at,
          }));
        setPending(unknownAlerts);
      }
    } catch {
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (id: number, action: 'approve' | 'reject') => {
    try {
      const selected = pending.find((p) => p.id === id);
      if (!selected) return;

      if (action === 'approve') {
        await api.post('/evolve', {
          title: selected.title,
          content: `${selected.content}\n\n建议: ${selected.suggestion || '无'}`,
          scam_type: selected.fraud_type === 'unknown' ? '新型诈骗待归类' : selected.fraud_type,
          source: `admin_review_alert_${selected.id}`,
        });
      }

      await api.put(`/alerts/${id}/resolve`);
      setPending((prev) => prev.filter((p) => p.id !== id));
      toast.success(action === 'approve' ? '已批准' : '已拒绝');
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const barOption = {
    title: { text: '检测趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: trendData.dates, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: 'value' as const },
    series: [{ data: trendData.counts, type: 'bar', itemStyle: { color: '#6366f1' }, barWidth: '60%' }],
    grid: { left: '10%', right: '5%', bottom: '20%' },
  };

  const pieOption = {
    title: { text: '诈骗类型分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      data: typeData,
      label: { fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary-800 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100">
              <ArrowLeft className="w-4 h-4" /> 返回首页
            </Link>
            <button onClick={fetchData} className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">管理后台</h1>
              <p className="text-sm opacity-80">系统管理与数据审核</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <ReactECharts option={barOption} style={{ height: 300 }} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <ReactECharts option={pieOption} style={{ height: 300 }} />
          </div>
        </div>

        {/* Review table */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-slate-800 mb-4">待审核未知风险事件 ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="text-slate-500 text-center py-8 text-sm">暂无待审核内容</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 pr-4">ID</th>
                    <th className="pb-3 pr-4">标题</th>
                    <th className="pb-3 pr-4">内容</th>
                    <th className="pb-3 pr-4">来源</th>
                    <th className="pb-3 pr-4">类型</th>
                    <th className="pb-3 pr-4">提交人</th>
                    <th className="pb-3 pr-4">时间</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-slate-500">{item.id}</td>
                      <td className="py-3 pr-4 text-slate-700 max-w-[180px] truncate">{item.title}</td>
                      <td className="py-3 pr-4 max-w-[200px] truncate">{item.content}</td>
                      <td className="py-3 pr-4 text-slate-500">{item.source}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{item.fraud_type}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{item.submitted_by}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleReview(item.id, 'approve')}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-green-200">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReview(item.id, 'reject')}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-red-200">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
