/**
 * 检测记录页面
 */
import { useEffect, useState } from 'react';
import { History as HistoryIcon, Filter } from 'lucide-react';
import api from '../api';

interface ConvRecord {
  id: number;
  input_type: string;
  input_content: string;
  is_fraud: boolean;
  fraud_type: string | null;
  risk_level: string;
  risk_score: number;
  ai_response: string;
  response_time_ms: number;
  created_at: string;
}

const RISK_LABELS: Record<string, string> = {
  safe: '安全', low: '低风险', medium: '中风险', high: '高风险', critical: '极高风险'
};
const RISK_COLORS: Record<string, string> = {
  safe: 'bg-green-100 text-green-700', low: 'bg-yellow-100 text-yellow-700',
  medium: 'bg-orange-100 text-orange-700', high: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800'
};

export default function History() {
  const [records, setRecords] = useState<ConvRecord[]>([]);
  const [fraudOnly, setFraudOnly] = useState(false);
  const [page, setPage] = useState(1);

  const loadRecords = () => {
    api.get('/detection/history', { params: { page, page_size: 20, fraud_only: fraudOnly } })
      .then(({ data }) => setRecords(data))
      .catch(() => {});
  };

  useEffect(() => { loadRecords(); }, [page, fraudOnly]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HistoryIcon className="w-7 h-7 text-primary-500" />
          检测记录
        </h1>
        <button
          onClick={() => { setFraudOnly(!fraudOnly); setPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${fraudOnly ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Filter className="w-4 h-4" />
          {fraudOnly ? '仅看危险' : '全部记录'}
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无检测记录</p>
          <p className="text-sm text-gray-400 mt-1">开始进行智能检测后，记录将在此展示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className={`bg-white rounded-xl shadow-sm border p-5 ${r.is_fraud ? 'border-red-200' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[r.risk_level] || RISK_COLORS.safe}`}>
                    {RISK_LABELS[r.risk_level] || '未知'}
                  </span>
                  <span className="text-xs text-gray-400">#{r.id}</span>
                  <span className="text-xs text-gray-400">{r.input_type}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{r.response_time_ms}ms</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2 mb-2">{r.input_content}</p>
              {r.ai_response && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 line-clamp-3">{r.ai_response}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>风险评分: <strong className={r.risk_score > 0.5 ? 'text-red-600' : 'text-green-600'}>
                  {(r.risk_score * 100).toFixed(0)}%
                </strong></span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center gap-3 py-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-600">第 {page} 页</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={records.length < 20}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
