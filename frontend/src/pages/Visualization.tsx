/**
 * 数据可视化大屏 - 6大可视化功能
 */
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area
} from 'recharts';
import { Map, BarChart3, TrendingUp, Users, Shield, Activity } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const COLORS = ['#1e40af', '#dc2626', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#84cc16'];

export default function Visualization() {
  const [fraudMap, setFraudMap] = useState<any[]>([]);
  const [fraudTypes, setFraudTypes] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<any[]>([]);
  const [riskDist, setRiskDist] = useState<any[]>([]);
  const [realtime, setRealtime] = useState<any>(null);

  useEffect(() => {
    Promise.allSettled([
      api.get('/statistics/fraud-map'),
      api.get('/statistics/fraud-types'),
      api.get('/statistics/trends?days=30'),
      api.get('/statistics/age-distribution'),
      api.get('/statistics/risk-distribution'),
      api.get('/statistics/realtime'),
    ]).then((results) => {
      const setters = [setFraudMap, setFraudTypes, setTrends, setAgeData, setRiskDist, setRealtime];
      let failed = 0;
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          setters[idx](res.value.data);
        } else {
          failed += 1;
        }
      });
      if (failed > 0) {
        toast.error(`部分可视化数据加载失败（${failed}项）`);
      }
    });
  }, []);

  const mapChartData = (fraudMap || []).map((item) => ({
    ...item,
    province: item?.province?.trim() ? item.province : '未知地区',
  })).slice(0, 15);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary-500" />
          反诈数据大屏
        </h1>
        <p className="text-sm text-gray-500 mt-1">全国诈骗态势感知与数据可视化分析</p>
      </div>

      {/* 实时指标条 */}
      {realtime && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '实时QPS', value: realtime.current_qps, unit: '/s', color: 'text-blue-600' },
            { label: '在线用户', value: realtime.active_users, unit: '人', color: 'text-green-600' },
            { label: '今日预警', value: realtime.alerts_today, unit: '次', color: 'text-orange-600' },
            { label: '今日拦截', value: realtime.blocked_today, unit: '次', color: 'text-red-600' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color} mt-1`}>
                {item.value}<span className="text-sm font-normal text-gray-400 ml-1">{item.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== 可视化1: 全国诈骗地图(柱状图替代) ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Map className="w-5 h-5 text-primary-500" /> 全国各省诈骗案件分布(Top 15)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mapChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="province"
                width={72}
                interval={0}
                allowDuplicatedCategory={false}
                tickMargin={6}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => String(value || '未知')}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  [name === 'case_count' ? `${value} 起` : `${value} 万元`, name === 'case_count' ? '案件数' : '涉案金额']
                }
                labelFormatter={(label) => `地区: ${label || '未知'}`}
              />
              <Bar dataKey="case_count" fill="#1e40af" radius={[0, 4, 4, 0]} name="案件数" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ===== 可视化2: 诈骗类型分布饼图 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-danger-500" /> 诈骗类型占比分布
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fraudTypes}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ label, percentage }) => `${label} ${percentage}%`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              >
                {fraudTypes.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} 起`, '案件数']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ===== 可视化3: 趋势折线图 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-safe-500" /> 近30日检测趋势分析
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e40af" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="total" name="检测总量" stroke="#1e40af" fill="url(#colorTotal)" />
              <Area type="monotone" dataKey="fraud" name="诈骗检出" stroke="#dc2626" fill="url(#colorFraud)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ===== 可视化4: 年龄分布 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-500" /> 受害者年龄段分布
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age_group" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value} 人`, '人数']} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                {ageData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ===== 可视化5: 风险等级雷达图 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-orange-500" /> 风险等级分布
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDist}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                label={({ label, count }) => `${label}: ${count}`}
              >
                {riskDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color || COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ===== 可视化6: 实时监控面板 ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-danger-500 animate-pulse" /> 实时反诈监控
          </h3>
          {realtime?.recent_detections?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">ID</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">类型</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">风险等级</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">评分</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">响应时间</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {realtime.recent_detections.map((d: any) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-800">#{d.id}</td>
                      <td className="py-2 px-3">{d.input_type}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium
                          ${d.is_fraud ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {d.is_fraud ? '⚠️ 危险' : '✅ 安全'}
                        </span>
                      </td>
                      <td className="py-2 px-3">{(d.risk_score * 100).toFixed(0)}%</td>
                      <td className="py-2 px-3 text-gray-600">{d.response_time_ms}ms</td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{new Date(d.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">暂无实时检测数据，开始检测后将在此展示</p>
          )}
        </div>
      </div>
    </div>
  );
}
