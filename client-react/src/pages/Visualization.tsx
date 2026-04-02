import { useEffect, useState } from 'react';
import { Eye, RefreshCw, TrendingUp, Shield, AlertTriangle, Users, Activity, BarChart3, PieChart, Clock } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import api from '../api';
import toast from 'react-hot-toast';

interface VisData {
  provinces: { name: string; value: number }[];
  fraudTypes: { name: string; value: number }[];
  trends: { dates: string[]; counts: number[] };
  ageGroups: { name: string; value: number }[];
  riskDistribution: { name: string; value: number }[];
  recentDetections: { id: number; text: string; risk_score: number; fraud_type_label: string; created_at: string }[];
}

interface FraudMapItem {
  province: string;
  case_count: number;
}

interface FraudTypeItem {
  label: string;
  count: number;
}

interface TrendItem {
  date: string;
  total: number;
}

interface AgeGroupItem {
  age_group: string;
  count: number;
}

interface RiskItem {
  label: string;
  count: number;
}

interface RealtimeItem {
  id: number;
  risk_score: number;
  risk_level: string;
  created_at: string;
}

const emptyData: VisData = {
  provinces: [], fraudTypes: [], trends: { dates: [], counts: [] },
  ageGroups: [], riskDistribution: [], recentDetections: [],
};

export default function Visualization() {
  const [data, setData] = useState<VisData>(emptyData);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [provRes, typeRes, trendRes, ageRes, riskRes, recentRes] = await Promise.allSettled([
        api.get('/statistics/fraud-map'),
        api.get('/statistics/fraud-types'),
        api.get('/statistics/trends'),
        api.get('/statistics/age-distribution'),
        api.get('/statistics/risk-distribution'),
        api.get('/statistics/realtime'),
      ]);

      const provincesRaw: FraudMapItem[] = provRes.status === 'fulfilled' ? (provRes.value.data || []) : [];
      const fraudTypesRaw: FraudTypeItem[] = typeRes.status === 'fulfilled' ? (typeRes.value.data || []) : [];
      const trendsRaw: TrendItem[] = trendRes.status === 'fulfilled' ? (trendRes.value.data || []) : [];
      const ageRaw: AgeGroupItem[] = ageRes.status === 'fulfilled' ? (ageRes.value.data || []) : [];
      const riskRaw: RiskItem[] = riskRes.status === 'fulfilled' ? (riskRes.value.data || []) : [];
      const realtimeRaw: RealtimeItem[] = recentRes.status === 'fulfilled'
        ? (recentRes.value.data?.recent_detections || [])
        : [];

      setData({
        provinces: provincesRaw.map((item) => ({ name: item.province, value: item.case_count })),
        fraudTypes: fraudTypesRaw.map((item) => ({ name: item.label, value: item.count })),
        trends: {
          dates: trendsRaw.map((item) => item.date),
          counts: trendsRaw.map((item) => item.total),
        },
        ageGroups: ageRaw.map((item) => ({ name: item.age_group, value: item.count })),
        riskDistribution: riskRaw.map((item) => ({ name: item.label, value: item.count })),
        recentDetections: realtimeRaw.map((item) => ({
          id: item.id,
          text: item.risk_level || '未知',
          risk_score: Math.round((item.risk_score || 0) * 100),
          fraud_type_label: item.risk_level || '未知',
          created_at: item.created_at,
        })),
      });
    } catch {
      toast.error('获取可视化数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 计算统计数据
  const totalCases = data.provinces.reduce((a, b) => a + b.value, 0);
  const totalTypes = data.fraudTypes.length;
  const totalRiskHigh = data.riskDistribution.find(r => r.name.includes('高'))?.value || 0;

  const provinceOption = {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0', textStyle: { color: '#334155' } },
    xAxis: { type: 'category' as const, data: data.provinces.slice(0, 10).map((p) => p.name), 
             axisLabel: { rotate: 30, fontSize: 11, color: '#64748b' },
             axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [{ 
      type: 'bar', 
      data: data.provinces.slice(0, 10).map((p) => p.value), 
      itemStyle: { 
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, 
                 colorStops: [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#818cf8' }] },
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: '60%'
    }],
    grid: { left: '8%', right: '5%', bottom: '20%', top: '8%' },
  };

  const fraudTypePieOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0' },
    color: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'],
    series: [{
      type: 'pie', radius: ['45%', '75%'], center: ['50%', '50%'],
      data: data.fraudTypes.slice(0, 8),
      label: { show: true, position: 'outside', formatter: '{b}', fontSize: 11, color: '#64748b' },
      labelLine: { length: 10, length2: 8 },
      emphasis: { 
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 0, 0, 0.2)' },
        label: { fontSize: 12, fontWeight: 'bold' }
      },
    }],
  };

  const trendAreaOption = {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0' },
    xAxis: { type: 'category' as const, data: data.trends.dates, boundaryGap: false,
             axisLabel: { fontSize: 10, color: '#64748b' }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [{
      type: 'line', data: data.trends.counts, smooth: true, symbol: 'circle', symbolSize: 6,
      areaStyle: { 
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, 
                 colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.35)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }] } 
      },
      lineStyle: { color: '#6366f1', width: 3 }, 
      itemStyle: { color: '#6366f1', borderColor: '#fff', borderWidth: 2 },
    }],
    grid: { left: '8%', right: '5%', bottom: '12%', top: '8%' },
  };

  const ageBarOption = {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0' },
    xAxis: { type: 'category' as const, data: data.ageGroups.map((a) => a.name),
             axisLabel: { color: '#64748b' }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value' as const, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [{ 
      type: 'bar', 
      data: data.ageGroups.map((a) => a.value), 
      itemStyle: { 
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                 colorStops: [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#fbbf24' }] },
        borderRadius: [4, 4, 0, 0]
      }, 
      barWidth: '50%' 
    }],
    grid: { left: '10%', right: '5%', bottom: '15%', top: '10%' },
  };

  const riskDonutOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0' },
    color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['50%', '50%'],
      data: data.riskDistribution,
      label: { show: true, position: 'outside', formatter: '{b}\n{d}%', fontSize: 11, color: '#64748b' },
      labelLine: { length: 8, length2: 6 },
      emphasis: { itemStyle: { shadowBlur: 15, shadowColor: 'rgba(0, 0, 0, 0.15)' } },
    }],
  };

  const riskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 
                        flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">数据大屏</h1>
            <p className="text-sm text-slate-500">全方位反诈数据可视化分析</p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2 
                     hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 font-medium text-slate-600">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新数据
        </button>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">总案例数</p>
              <p className="text-3xl font-bold mt-1">{totalCases.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">诈骗类型</p>
              <p className="text-3xl font-bold mt-1">{totalTypes}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <PieChart className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">高危预警</p>
              <p className="text-3xl font-bold mt-1">{totalRiskHigh}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">监控省份</p>
              <p className="text-3xl font-bold mt-1">{data.provinces.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid 布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 检测趋势 - 大卡片 */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">检测趋势</h3>
            </div>
            <span className="text-xs text-slate-400">最近30天</span>
          </div>
          <div className="p-4">
            <ReactECharts option={trendAreaOption} style={{ height: 280 }} />
          </div>
        </div>

        {/* 风险等级分布 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-slate-800">风险等级</h3>
          </div>
          <div className="p-4">
            <ReactECharts option={riskDonutOption} style={{ height: 280 }} />
          </div>
        </div>

        {/* 省份分布 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">省份分布 TOP10</h3>
          </div>
          <div className="p-4">
            <ReactECharts option={provinceOption} style={{ height: 280 }} />
          </div>
        </div>

        {/* 诈骗类型 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-slate-800">诈骗类型分布</h3>
          </div>
          <div className="p-4">
            <ReactECharts option={fraudTypePieOption} style={{ height: 280 }} />
          </div>
        </div>

        {/* 年龄分布 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-slate-800">受害者年龄分布</h3>
          </div>
          <div className="p-4">
            <ReactECharts option={ageBarOption} style={{ height: 280 }} />
          </div>
        </div>
      </div>

      {/* 最近检测记录 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">最近检测记录</h3>
          </div>
          <span className="text-xs text-slate-400">实时更新</span>
        </div>
        <div className="overflow-x-auto">
          {data.recentDetections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>暂无检测记录</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">风险等级</th>
                  <th className="px-6 py-3 font-medium">风险分数</th>
                  <th className="px-6 py-3 font-medium">类型</th>
                  <th className="px-6 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentDetections.slice(0, 10).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-600">#{d.id}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${riskColor(d.risk_score)}`}>
                        {d.text}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              d.risk_score >= 70 ? 'bg-red-500' : d.risk_score >= 40 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${d.risk_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-600">{d.risk_score}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{d.fraud_type_label}</td>
                    <td className="px-6 py-3 text-sm text-slate-400">
                      {new Date(d.created_at).toLocaleString('zh-CN', { 
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
