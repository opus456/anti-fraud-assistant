import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, RefreshCw, TrendingUp, Shield, AlertTriangle, Users, Activity, BarChart3, PieChart, Clock, Zap, Target, Radar } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import api from '../api';
import toast from 'react-hot-toast';
import { AnimatedCounter } from '../components/motion';

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

// 实时滚动消息
const scrollingMessages = [
  '🚨 广东省拦截一起投资诈骗案件，涉案金额 ¥128,000',
  '🛡️ 上海市成功预警冒充公检法诈骗，已通知用户',
  '⚠️ 北京市检测到AI换脸诈骗视频，已标记高风险',
  '✅ 浙江省阻断刷单诈骗链路，保护 3 位用户',
  '🔔 江苏省监测到虚假贷款APP，已加入黑名单',
  '🚨 四川省拦截杀猪盘诈骗，保护资金 ¥85,000',
];

export default function Visualization() {
  const [data, setData] = useState<VisData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [messageIndex, setMessageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 实时更新时间
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 滚动消息
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % scrollingMessages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 自动刷新数据
  useEffect(() => {
    const timer = setInterval(fetchData, 60000); // 每分钟刷新
    return () => clearInterval(timer);
  }, [fetchData]);

  // 计算统计数据
  const totalCases = data.provinces.reduce((a, b) => a + b.value, 0);
  const totalTypes = data.fraudTypes.length;
  const totalRiskHigh = data.riskDistribution.find(r => r.name.includes('高'))?.value || 0;
  const totalRiskAll = data.riskDistribution.reduce((a, b) => a + b.value, 0);
  const totalDetections = data.trends.counts.reduce((a, b) => a + b, 0);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ==================== 图表配置 ====================
  
  // 省份诈骗热力柱状图 (替代地图)
  const provinceBarOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#334155' },
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(0, 163, 224, 0.1)' }
      },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `<strong>${p.name}</strong><br/>诈骗案件: <span style="color:#ef4444;font-weight:bold">${p.value.toLocaleString()}</span> 起`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category' as const,
      data: data.provinces.slice(0, 15).map(p => p.name),
      axisLabel: {
        rotate: 35,
        fontSize: 10,
        color: '#64748b',
        interval: 0
      },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value' as const,
      name: '案件数',
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLine: { show: false }
    },
    series: [{
      type: 'bar',
      barWidth: '60%',
      data: data.provinces.slice(0, 15).map((p, i) => ({
        value: p.value,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: i < 3 ? '#ef4444' : i < 6 ? '#f97316' : i < 10 ? '#eab308' : '#22c55e' },
              { offset: 1, color: i < 3 ? '#fca5a5' : i < 6 ? '#fdba74' : i < 10 ? '#fde047' : '#86efac' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      })),
      label: {
        show: true,
        position: 'top',
        formatter: (params: { value: number }) => params.value >= 1000 ? (params.value / 1000).toFixed(1) + 'k' : params.value,
        fontSize: 9,
        color: '#64748b'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        }
      }
    }],
    animationDuration: 1500,
    animationEasing: 'elasticOut'
  };

  // 诈骗类型玫瑰图
  const fraudTypeRoseOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
      textStyle: { color: '#334155' },
    },
    color: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'],
    series: [{
      type: 'pie',
      radius: ['20%', '75%'],
      center: ['50%', '50%'],
      roseType: 'area',
      data: data.fraudTypes.slice(0, 8),
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
        fontSize: 10,
        color: '#64748b',
      },
      labelLine: {
        length: 8,
        length2: 5,
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.2)',
        },
      },
      animationType: 'scale',
      animationEasing: 'elasticOut',
    }],
  };

  // 趋势面积图
  const trendAreaOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e2e8f0',
    },
    xAxis: {
      type: 'category',
      data: data.trends.dates,
      boundaryGap: false,
      axisLabel: { fontSize: 10, color: '#64748b', interval: 4 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [{
      type: 'line',
      data: data.trends.counts,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99,102,241,0.4)' },
            { offset: 1, color: 'rgba(99,102,241,0.02)' },
          ],
        },
      },
      lineStyle: { color: '#6366f1', width: 3 },
      itemStyle: { color: '#6366f1', borderColor: '#fff', borderWidth: 2 },
    }],
    grid: { left: '8%', right: '5%', bottom: '12%', top: '8%' },
  };

  // 年龄分布横向条形图
  const ageBarOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: data.ageGroups.map(a => a.name).reverse(),
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [{
      type: 'bar',
      data: data.ageGroups.map(a => a.value).reverse(),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#fbbf24' },
            { offset: 1, color: '#f97316' },
          ],
        },
        borderRadius: [0, 4, 4, 0],
      },
      barWidth: '60%',
    }],
    grid: { left: '20%', right: '8%', bottom: '10%', top: '8%' },
  };

  // 风险仪表盘
  const riskGaugeOption = {
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      radius: '100%',
      center: ['50%', '70%'],
      splitNumber: 5,
      pointer: {
        icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
        length: '60%',
        width: 8,
        itemStyle: { color: '#6366f1' },
      },
      axisLine: {
        lineStyle: {
          width: 20,
          color: [
            [0.3, '#22c55e'],
            [0.6, '#eab308'],
            [0.8, '#f97316'],
            [1, '#ef4444'],
          ],
        },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        distance: -35,
        color: '#64748b',
        fontSize: 10,
      },
      title: {
        offsetCenter: [0, '20%'],
        fontSize: 14,
        color: '#334155',
      },
      detail: {
        fontSize: 28,
        offsetCenter: [0, '-10%'],
        valueAnimation: true,
        formatter: '{value}%',
        color: '#1e293b',
      },
      data: [{ value: Math.round((totalRiskHigh / (totalRiskAll || 1)) * 100), name: '高风险占比' }],
    }],
  };

  const riskColor = (score: number) => {
    if (score >= 70) return 'text-red-500 bg-red-500/10';
    if (score >= 40) return 'text-amber-500 bg-amber-500/10';
    return 'text-green-500 bg-green-500/10';
  };

  return (
    <div className={`min-h-screen ${isFullscreen ? 'p-4' : ''}`}>
      {/* 顶部标题栏 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-5 mb-6 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">反诈数据可视化大屏</h1>
              <p className="text-white/80 text-sm mt-1">全方位智能监控 · 实时数据分析</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-white">
            {/* 实时时间 */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg">
                {currentTime.toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
            </div>
            
            {/* 刷新按钮 */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            
            {/* 全屏按钮 */}
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur transition-colors"
            >
              {isFullscreen ? '退出全屏' : '全屏展示'}
            </button>
          </div>
        </div>
        
        {/* 滚动消息 */}
        <div className="mt-4 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center gap-2 text-white/90"
            >
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-sm">{scrollingMessages[messageIndex]}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: '累计检测', value: totalDetections, icon: Target, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/25' },
          { label: '诈骗案件', value: totalCases, icon: AlertTriangle, color: 'from-red-500 to-pink-500', shadow: 'shadow-red-500/25' },
          { label: '诈骗类型', value: totalTypes, icon: PieChart, color: 'from-purple-500 to-indigo-500', shadow: 'shadow-purple-500/25' },
          { label: '高危预警', value: totalRiskHigh, icon: Radar, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/25' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-gradient-to-br ${item.color} rounded-2xl p-5 text-white shadow-lg ${item.shadow}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">{item.label}</p>
                <p className="text-3xl font-bold mt-1">
                  <AnimatedCounter value={item.value} />
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <item.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 主体图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 中国地图 - 大卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">全国省份诈骗案件TOP15</h3>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3" /> 实时更新
            </span>
          </div>
          <div className="p-4">
            <ReactECharts option={provinceBarOption} style={{ height: 400 }} />
          </div>
        </motion.div>

        {/* 风险仪表盘 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-800">风险指数</h3>
          </div>
          <div className="p-4">
            <ReactECharts option={riskGaugeOption} style={{ height: 200 }} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {data.riskDistribution.slice(0, 4).map((item, idx) => (
                <div key={idx} className="text-center p-3 bg-slate-50 rounded-xl">
                  <div className="text-lg font-bold text-slate-800">{item.value.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 下方图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 检测趋势 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">检测趋势</h3>
            </div>
            <span className="text-xs text-slate-400">最近30天</span>
          </div>
          <div className="p-4">
            <ReactECharts option={trendAreaOption} style={{ height: 240 }} />
          </div>
        </motion.div>

        {/* 诈骗类型分布 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-pink-600" />
            <h3 className="font-semibold text-slate-800">诈骗类型分布</h3>
          </div>
          <div className="p-4">
            <ReactECharts option={fraudTypeRoseOption} style={{ height: 240 }} />
          </div>
        </motion.div>

        {/* 年龄分布 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-slate-800">受害者年龄分布</h3>
          </div>
          <div className="p-4">
            <ReactECharts option={ageBarOption} style={{ height: 240 }} />
          </div>
        </motion.div>
      </div>

      {/* 实时检测记录 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">实时检测记录</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-400">实时更新</span>
          </div>
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
                {data.recentDetections.slice(0, 8).map((d) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-slate-600 font-mono">#{d.id}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${riskColor(d.risk_score)}`}>
                        {d.text}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${d.risk_score}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              d.risk_score >= 70 ? 'bg-red-500' : d.risk_score >= 40 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-600 w-10">{d.risk_score}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{d.fraud_type_label}</td>
                    <td className="px-6 py-3 text-sm text-slate-400">
                      {new Date(d.created_at).toLocaleString('zh-CN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
