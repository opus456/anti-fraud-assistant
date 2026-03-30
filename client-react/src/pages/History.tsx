import { useEffect, useState } from 'react';
import { History as HistoryIcon, Filter, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

interface HistoryItem {
  id: number;
  input_content: string;
  is_fraud: boolean;
  risk_score: number;
  risk_level: string;
  fraud_type: string | null;
  ai_response: string;
  response_time_ms: number;
  created_at: string;
}

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [fraudOnly, setFraudOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const pageSize = 10;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (fraudOnly) params.fraud_only = true;
      const { data } = await api.get('/detection/history', { params });
      const list = Array.isArray(data) ? data : data.items || data.records || [];
      setItems(list);
      setTotal(data.total ?? (list.length === pageSize ? page * pageSize + 1 : (page - 1) * pageSize + list.length));
    } catch (err: any) {
      toast.error(err.message || '获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, fraudOnly]);

  const totalPages = Math.ceil(total / pageSize);

  const riskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-primary-600" /> 检测记录
        </h1>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={fraudOnly} onChange={(e) => { setFraudOnly(e.target.checked); setPage(1); }}
            className="w-4 h-4 text-primary-600 rounded" />
          <Filter className="w-4 h-4 text-gray-400" />
          仅显示诈骗记录
        </label>
      </div>

      <p className="text-sm text-gray-500">共 {total} 条记录</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无检测记录</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id}
              className="bg-white rounded-xl border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
              <div className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  item.is_fraud ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {item.is_fraud
                    ? <AlertTriangle className="w-5 h-5 text-red-600" />
                    : <ShieldCheck className="w-5 h-5 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{item.input_content}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColor(item.risk_score * 100)}`}>
                      {Math.round(item.risk_score * 100)}分
                    </span>
                    <span className="text-xs text-gray-400">{item.fraud_type || ''}</span>
                    <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              {expanded === item.id && (
                <div className="px-4 pb-4 border-t pt-3">
                  <p className="text-sm text-gray-600 mb-2"><span className="font-medium">完整内容：</span>{item.input_content}</p>
                  <p className="text-sm text-gray-600 mb-1"><span className="font-medium">风险等级：</span>{item.risk_level}</p>
                  {item.ai_response && (
                    <p className="text-sm text-gray-600"><span className="font-medium">分析：</span>{item.ai_response}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">第 {page} / {totalPages} 页</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
