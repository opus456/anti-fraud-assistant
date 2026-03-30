import { useState, useEffect } from 'react';
import { FileText, Plus, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import toast from 'react-hot-toast';

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
    } catch (err: any) {
      toast.error(err.message || '获取报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/reports/generate', { report_type: 'weekly' });
      toast.success('报告生成成功');
      const newReport = data.report || data;
      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
      setViewMode('detail');
    } catch (err: any) {
      toast.error(err.message || '生成报告失败');
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = async (report: Report) => {
    // Fetch full content if needed
    if (!report.content) {
      try {
        const { data } = await api.get(`/reports/${report.id}`);
        const full = data.report || data;
        setSelectedReport(full);
      } catch {
        setSelectedReport(report);
      }
    } else {
      setSelectedReport(report);
    }
    setViewMode('detail');
  };

  if (viewMode === 'detail' && selectedReport) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => setViewMode('list')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full">
                {selectedReport.report_type || '安全报告'}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(selectedReport.created_at).toLocaleString()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">{selectedReport.title}</h1>
            {selectedReport.summary && (
              <p className="text-sm text-gray-500 mt-2">{selectedReport.summary}</p>
            )}
          </div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{selectedReport.content || '暂无详细内容'}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary-600" /> 安全报告
        </h1>
        <button onClick={handleGenerate} disabled={generating}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2 text-sm disabled:opacity-50">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {generating ? '生成中...' : '生成报告'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">暂无安全报告</p>
          <p className="text-gray-400 text-sm mt-1">点击上方按钮生成您的第一份安全报告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id}
              onClick={() => openDetail(report)}
              className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800 truncate">{report.title}</h3>
                <p className="text-sm text-gray-500 truncate mt-0.5">{report.summary || '点击查看详情'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                    {report.report_type || '安全报告'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
