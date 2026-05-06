import { useState, useEffect } from 'react';
import { FileText, Plus, ChevronRight, ArrowLeft, Loader2, Shield, AlertTriangle, Activity, TrendingUp, BarChart3, PieChart, CheckCircle2, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactECharts from 'echarts-for-react';
import api from '../api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface Report {
  id: number;
  title: string;
  summary: string;
  content: string;
  created_at: string;
  report_type: string;
  total_detections: number;
  fraud_detected: number;
  risk_summary: Record<string, number>;
  fraud_type_summary: Record<string, number>;
  suggestions: string[];
  period_start: string;
  period_end: string;
}

type ViewMode = 'list' | 'detail';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/');
      const list = Array.isArray(data) ? data : data.reports || [];
      setReports(list);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '获取报告列表失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/reports/generate', { report_type: 'weekly' });
      toast.success('报告生成成功');
      const newReport = data.report || data;
      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
      setViewMode('detail');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '生成报告失败');
    } finally { setGenerating(false); }
  };

  const openDetail = async (report: Report) => {
    if (!report.content) {
      try { const { data } = await api.get(`/reports/${report.id}`); setSelectedReport(data.report || data); } catch { setSelectedReport(report); }
    } else { setSelectedReport(report); }
    setViewMode('detail');
  };

  if (viewMode === 'detail' && selectedReport) {
    const safeCount = (selectedReport.total_detections || 0) - (selectedReport.fraud_detected || 0);
    const fraudRate = selectedReport.total_detections > 0 ? ((selectedReport.fraud_detected / selectedReport.total_detections) * 100).toFixed(1) : '0';
    const safeRate = selectedReport.total_detections > 0 ? (100 - parseFloat(fraudRate)).toFixed(1) : '100';

    const riskSummary = selectedReport.risk_summary || {};
    const fraudTypeSummary = selectedReport.fraud_type_summary || {};
    const suggestions = selectedReport.suggestions || [];

    // 风险等级分布饼图
    const riskLabels: Record<string, string> = { safe: '安全', low: '低风险', medium: '中风险', high: '高风险', critical: '极高风险' };
    const riskColors: Record<string, string> = { safe: '#10b981', low: '#22d3ee', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
    const riskPieData = Object.entries(riskSummary).map(([k, v]) => ({
      name: riskLabels[k] || k, value: v,
      itemStyle: { color: riskColors[k] || '#94a3b8' }
    }));

    const riskPieOption = {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}次 ({d}%)' },
      legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 12 } },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: riskPieData.length > 0 ? riskPieData : [{ name: '暂无数据', value: 1, itemStyle: { color: '#e2e8f0' } }],
      }],
    };

    // 诈骗类型柱状图
    const typeLabels: Record<string, string> = {
      impersonation: '冒充身份', investment: '投资理财', loan: '贷款代办',
      shopping: '网购退款', romance: '杀猪盘', gambling: '赌博诈骗',
      telecom: '电信诈骗', phishing: '钓鱼诈骗', identity_theft: '身份盗用',
      other: '其他诈骗'
    };
    const typeSorted = Object.entries(fraudTypeSummary).sort(([, a], [, b]) => b - a);
    const typeBarOption = {
      tooltip: { trigger: 'axis' as const },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '8%', containLabel: true },
      xAxis: { type: 'category' as const, data: typeSorted.map(([k]) => typeLabels[k] || k), axisLabel: { rotate: 30, fontSize: 11, color: '#64748b' }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
      yAxis: { type: 'value' as const, minInterval: 1, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
      series: [{
        type: 'bar', data: typeSorted.map(([, v]) => v), barWidth: '50%',
        itemStyle: { borderRadius: [6, 6, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f97316' }, { offset: 1, color: '#fb923c' }] } },
      }],
    };

    // 安全/风险占比环形图
    const safetyGaugeOption = {
      series: [{
        type: 'gauge', startAngle: 220, endAngle: -40, radius: '90%', center: ['50%', '55%'],
        min: 0, max: 100,
        pointer: { show: true, length: '55%', width: 4, itemStyle: { color: parseFloat(safeRate) >= 80 ? '#10b981' : parseFloat(safeRate) >= 50 ? '#f59e0b' : '#ef4444' } },
        axisLine: { lineStyle: { width: 18, color: [[0.5, '#ef4444'], [0.8, '#f59e0b'], [1, '#10b981']] } },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { width: 2, color: '#fff' } },
        axisLabel: { distance: 22, color: '#94a3b8', fontSize: 11, formatter: (v: number) => v === 0 || v === 50 || v === 100 ? `${v}` : '' },
        title: { show: true, offsetCenter: [0, '70%'], fontSize: 13, color: '#64748b' },
        detail: { fontSize: 28, fontWeight: 'bold' as const, offsetCenter: [0, '40%'], color: parseFloat(safeRate) >= 80 ? '#10b981' : parseFloat(safeRate) >= 50 ? '#f59e0b' : '#ef4444', formatter: '{value}%' },
        data: [{ value: parseFloat(safeRate), name: '安全率' }],
      }],
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <button onClick={() => setViewMode('list')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488] transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>

        {/* 报告头部 */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-[#0e7490] to-[#0891b2] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs rounded-full font-medium backdrop-blur-sm">
                  {selectedReport.report_type === 'weekly' ? '📅 周报' : selectedReport.report_type === 'monthly' ? '📆 月报' : '📋 ' + (selectedReport.report_type || '安全报告')}
                </span>
                <span className="text-xs text-white/60 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(selectedReport.created_at).toLocaleString()}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white">{selectedReport.title}</h1>
              {selectedReport.period_start && selectedReport.period_end && (
                <p className="text-sm text-white/50 mt-1.5">
                  统计区间: {new Date(selectedReport.period_start).toLocaleDateString()} — {new Date(selectedReport.period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 数据概览卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '检测总数', value: selectedReport.total_detections || 0, icon: Activity, color: 'from-blue-500 to-cyan-500', bg: 'bg-accent-50', text: 'text-accent-600' },
            { label: '风险拦截', value: selectedReport.fraud_detected || 0, icon: AlertTriangle, color: 'from-orange-500 to-red-500', bg: 'bg-orange-50', text: 'text-orange-600' },
            { label: '安全放行', value: safeCount, icon: CheckCircle2, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: '安全率', value: `${safeRate}%`, icon: Shield, color: 'from-teal-500 to-teal-600', bg: 'bg-accent-50', text: 'text-accent-600' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-xl bg-white border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-slate-500 font-medium">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 安全率仪表盘 */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">安全评估</h3>
            </div>
            <ReactECharts option={safetyGaugeOption} style={{ height: 200 }} />
          </motion.div>

          {/* 风险等级分布 */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-semibold text-slate-700">风险等级分布</h3>
            </div>
            <ReactECharts option={riskPieOption} style={{ height: 200 }} />
          </motion.div>

          {/* 诈骗类型分布 */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
            className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-slate-700">诈骗类型TOP</h3>
            </div>
            {typeSorted.length > 0 ? (
              <ReactECharts option={typeBarOption} style={{ height: 200 }} />
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-slate-700">
                <CheckCircle2 className="w-10 h-10 mb-2" />
                <span className="text-sm">未检出诈骗类型</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* 安全建议 */}
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-amber-800">安全建议</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((s: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-900/80">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-200/60 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 风险详情指标列表 */}
        {Object.keys(riskSummary).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-700">风险等级明细</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(riskSummary).sort(([, a], [, b]) => b - a).map(([level, count]) => {
                const pct = selectedReport.total_detections > 0 ? (count / selectedReport.total_detections) * 100 : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-16 text-right font-medium">{riskLabels[level] || level}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.6 }}
                        className="h-full rounded-full" style={{ backgroundColor: riskColors[level] || '#94a3b8' }} />
                    </div>
                    <span className="text-sm text-slate-500 w-20 text-right">{count}次 ({pct.toFixed(1)}%)</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Markdown 报告正文 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">详细分析报告</h3>
          </div>
          <div className="p-6 prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-500 prose-strong:text-slate-700 prose-li:text-slate-500">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
                    <table className="min-w-full text-sm" {...props}>{children}</table>
                  </div>
                ),
                thead: ({ children, ...props }) => (
                  <thead className="bg-white" {...props}>{children}</thead>
                ),
                th: ({ children, ...props }) => (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200" {...props}>{children}</th>
                ),
                td: ({ children, ...props }) => (
                  <td className="px-4 py-2 text-slate-500 border-b border-slate-200" {...props}>{children}</td>
                ),
                tr: ({ children, ...props }) => (
                  <tr className="hover:bg-white/60 transition-colors" {...props}>{children}</tr>
                ),
              }}
            >
              {selectedReport.content || '暂无详细内容'}
            </ReactMarkdown>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner - 青色 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#134e4a] via-[#0e7490] to-[#155e75] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 text-white/[0.03]" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex-1">
            <p className="text-white/40 text-sm mb-2 font-medium">Security Reports · 安全文档</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">安全报告</h1>
            <p className="text-white/40 text-sm">AI 驱动的安全态势分析报告 · {reports.length} 份</p>
          </div>
          <button onClick={handleGenerate} disabled={generating} className="px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl text-white text-sm transition-all flex items-center gap-2 disabled:opacity-50">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {generating ? '生成中...' : '生成报告'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-800 mx-auto mb-4" />
          <p className="text-slate-500 mb-1">暂无安全报告</p>
          <p className="text-slate-500 text-sm">点击上方按钮生成您的第一份安全报告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, idx) => {
            const fraudRate = report.total_detections > 0 ? ((report.fraud_detected / report.total_detections) * 100).toFixed(0) : '0';
            const safeRate = report.total_detections > 0 ? (100 - parseFloat(fraudRate)).toFixed(0) : '100';
            const riskLevel = parseFloat(safeRate) >= 80 ? 'safe' : parseFloat(safeRate) >= 50 ? 'warn' : 'danger';
            const riskConfig = { safe: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: '安全' }, warn: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: '注意' }, danger: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: '警告' } }[riskLevel];
            return (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              onClick={() => openDetail(report)}
              className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-cyan-200 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 group-hover:text-cyan-700 truncate transition-colors">{report.title}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{report.report_type === 'weekly' ? '周报' : report.report_type === 'monthly' ? '月报' : '报告'}</span>
                  {report.total_detections > 0 && (
                    <>
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-600 text-xs rounded-full">
                        <Activity className="w-3 h-3" /> {report.total_detections}次检测
                      </span>
                      {report.fraud_detected > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full">
                          <AlertTriangle className="w-3 h-3" /> {report.fraud_detected}次风险
                        </span>
                      )}
                      <span className={`flex items-center gap-1 px-2 py-0.5 ${riskConfig.bg} ${riskConfig.color} text-xs rounded-full`}>
                        <Shield className="w-3 h-3" /> {safeRate}% {riskConfig.label}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* 右侧迷你安全率环 */}
              <div className="flex flex-col items-center flex-shrink-0 mr-1 hidden sm:flex">
                <svg className="w-11 h-11" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none"
                    stroke={riskLevel === 'safe' ? '#10b981' : riskLevel === 'warn' ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${parseFloat(safeRate) * 0.88} 88`}
                    transform="rotate(-90 18 18)" />
                </svg>
                <span className={`text-[10px] font-bold mt-0.5 ${riskConfig.color}`}>{safeRate}%</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

