import { useEffect, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
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

  const provinceOption = {
    title: { text: '各省份诈骗分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: data.provinces.map((p) => p.name), axisLabel: { rotate: 45, fontSize: 9 } },
    yAxis: { type: 'value' as const },
    series: [{ type: 'bar', data: data.provinces.map((p) => p.value), itemStyle: { color: '#6366f1' } }],
    grid: { left: '10%', right: '5%', bottom: '25%' },
  };

  const fraudTypePieOption = {
    title: { text: '诈骗类型分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' as const },
    legend: { bottom: 0, type: 'scroll' as const, textStyle: { fontSize: 10 } },
    series: [{
      type: 'pie', radius: ['30%', '60%'], data: data.fraudTypes,
      label: { show: false }, emphasis: { label: { show: true } },
    }],
  };

  const trendAreaOption = {
    title: { text: '检测趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: data.trends.dates, axisLabel: { rotate: 45, fontSize: 10 } },
    yAxis: { type: 'value' as const },
    series: [{
      type: 'line', data: data.trends.counts, smooth: true,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.3)' }, { offset: 1, color: 'rgba(99,102,241,0.05)' }] } },
      lineStyle: { color: '#6366f1' }, itemStyle: { color: '#6366f1' },
    }],
    grid: { left: '10%', right: '5%', bottom: '20%' },
  };

  const ageBarOption = {
    title: { text: '受害者年龄分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: data.ageGroups.map((a) => a.name) },
    yAxis: { type: 'value' as const },
    series: [{ type: 'bar', data: data.ageGroups.map((a) => a.value), itemStyle: { color: '#f59e0b' }, barWidth: '50%' }],
    grid: { left: '10%', right: '5%', bottom: '15%' },
  };

  const riskDonutOption = {
    title: { text: '风险等级分布', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' as const },
    color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
    series: [{
      type: 'pie', radius: ['40%', '65%'], data: data.riskDistribution,
      label: { formatter: '{b}: {d}%', fontSize: 11 },
    }],
  };

  const riskColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Eye className="w-6 h-6 text-primary-600" /> 数据大屏
        </h1>
        <button onClick={fetchData} disabled={loading}
          className="px-4 py-2 text-sm border rounded-lg flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </button>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <ReactECharts option={provinceOption} style={{ height: 320 }} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <ReactECharts option={fraudTypePieOption} style={{ height: 320 }} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <ReactECharts option={trendAreaOption} style={{ height: 320 }} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <ReactECharts option={ageBarOption} style={{ height: 320 }} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <ReactECharts option={riskDonutOption} style={{ height: 320 }} />
        </div>

        {/* Realtime table */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">最近检测记录</h3>
          <div className="overflow-y-auto max-h-[280px]">
            {data.recentDetections.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">暂无数据</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-500 text-left">
                    <th className="pb-2 pr-2">内容</th>
                    <th className="pb-2 pr-2">分数</th>
                    <th className="pb-2 pr-2">类型</th>
                    <th className="pb-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDetections.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 max-w-[120px] truncate">{d.text}</td>
                      <td className={`py-2 pr-2 font-bold ${riskColor(d.risk_score)}`}>{d.risk_score}</td>
                      <td className="py-2 pr-2">{d.fraud_type_label}</td>
                      <td className="py-2 text-gray-400">{new Date(d.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
