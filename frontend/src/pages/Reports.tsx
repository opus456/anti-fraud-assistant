/**
 * 安全报告页面
 */
import { useState, useEffect } from 'react';
import { FileText, Plus, Calendar, ChevronRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import api from '../api';

interface Report {
  id: number;
  report_type: string;
  content: string;
  risk_summary: string;
  created_at: string;
}

const typeLabels: Record<string, string> = { daily: '日报', weekly: '周报', monthly: '月报' };

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState('weekly');
  const [detail, setDetail] = useState<Report | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get('/reports/');
      setReports(data);
    } catch {
      toast.error('加载报告失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/reports/generate', { report_type: genType });
      toast.success('报告已生成');
      setDetail(data);
      load();
    } catch {
      toast.error('生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  if (detail) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pb-20 lg:pb-0">
        <button onClick={() => setDetail(null)} className="text-sm text-primary-500 hover:underline">
          ← 返回列表
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 text-xs rounded bg-primary-100 text-primary-700">
              {typeLabels[detail.report_type] || detail.report_type}
            </span>
            <span className="text-sm text-gray-400">{new Date(detail.created_at).toLocaleString('zh-CN')}</span>
          </div>
          {detail.risk_summary && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{detail.risk_summary}</span>
            </div>
          )}
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{detail.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-0">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FileText className="w-7 h-7 text-primary-500" />
        安全报告
      </h1>

      {/* 生成报告 */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-5 border border-primary-100">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary-500" />
          生成安全报告
        </h3>
        <p className="text-sm text-gray-500 mb-4">基于您的检测历史和风险画像，AI为您生成个性化安全分析报告。</p>
        <div className="flex items-center gap-3">
          <select value={genType} onChange={(e) => setGenType(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="daily">日报</option>
            <option value="weekly">周报</option>
            <option value="monthly">月报</option>
          </select>
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-1 bg-primary-500 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-primary-600 disabled:opacity-50">
            <Plus className="w-4 h-4" />
            {generating ? '生成中...' : '生成报告'}
          </button>
        </div>
      </div>

      {/* 报告列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">暂无报告</p>
          <p className="text-gray-400 text-sm">点击上方按钮生成第一份安全报告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <button key={r.id} onClick={() => setDetail(r)}
              className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-primary-200 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">
                        {typeLabels[r.report_type] || r.report_type}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(r.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
              {r.risk_summary && (
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{r.risk_summary}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
