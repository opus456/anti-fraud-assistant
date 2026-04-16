import { useState, useEffect } from 'react';
import { FileText, Plus, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => setViewMode('list')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#007AFF] transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>
        <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0e7490] to-[#0891b2] p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs rounded-full font-medium">{selectedReport.report_type || '安全报告'}</span>
              <span className="text-xs text-white/60">{new Date(selectedReport.created_at).toLocaleString()}</span>
            </div>
            <h1 className="text-xl font-bold text-white">{selectedReport.title}</h1>
            {selectedReport.summary && <p className="text-sm text-white/60 mt-2">{selectedReport.summary}</p>}
          </div>
          <div className="p-6 prose prose-sm max-w-none"><ReactMarkdown>{selectedReport.content || '暂无详细内容'}</ReactMarkdown></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner - 青色 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#134e4a] via-[#0e7490] to-[#155e75] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
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
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 mb-1">暂无安全报告</p>
          <p className="text-slate-400 text-sm">点击上方按钮生成您的第一份安全报告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, idx) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              onClick={() => openDetail(report)}
              className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 hover:border-cyan-200 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 group-hover:text-cyan-700 truncate transition-colors">{report.title}</h3>
                <p className="text-sm text-slate-500 truncate mt-0.5">{report.summary || '点击查看详情'}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleString()}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{report.report_type || '安全报告'}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

