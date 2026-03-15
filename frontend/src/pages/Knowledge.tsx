/**
 * 知识库页面 - 检索反诈法律法规、案例、预防指南
 */
import { useState } from 'react';
import { BookOpen, Search, Scale, FileWarning, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  similarity: number;
}

const categoryOptions = [
  { value: '', label: '全部', icon: BookOpen, color: 'text-gray-600' },
  { value: 'law', label: '法律法规', icon: Scale, color: 'text-blue-600' },
  { value: 'case', label: '典型案例', icon: FileWarning, color: 'text-red-600' },
  { value: 'prevention', label: '预防指南', icon: ShieldCheck, color: 'text-green-600' },
  { value: 'warning', label: '预警信息', icon: AlertTriangle, color: 'text-orange-600' },
];

const CATEGORY_LABELS: Record<string, string> = {
  law: '法律法规', case: '典型案例', prevention: '预防指南', warning: '预警信息'
};

export default function Knowledge() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) { toast.error('请输入搜索关键词'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/knowledge/search', {
        query: query.trim(),
        top_k: 10,
        category: category || null,
      });
      setResults(data);
      if (data.length === 0) toast('未找到相关内容，请尝试其他关键词', { icon: '🔍' });
    } catch {
      toast.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get('/knowledge/stats');
      setStats(data);
    } catch {}
  };

  useState(() => { loadStats(); });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary-500" />
          反诈知识库
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          搜索反诈法律法规、典型案例、预防指南
          {stats && <span className="ml-2">（共 {stats.total} 条知识）</span>}
        </p>
      </div>

      {/* 搜索区 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入关键词搜索，如：投资诈骗、反电信网络诈骗法..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categoryOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${category === opt.value ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-primary-200 transition-colors cursor-pointer"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium
                    ${item.category === 'law' ? 'bg-blue-100 text-blue-700' :
                      item.category === 'case' ? 'bg-red-100 text-red-700' :
                      item.category === 'prevention' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'}`}>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                  <span className="text-xs text-primary-500">
                    相似度 {(item.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className={`text-sm text-gray-600 ${expandedId === item.id ? '' : 'line-clamp-3'}`}>
                {item.content}
              </p>
              {item.source && (
                <p className="text-xs text-gray-400 mt-2">来源: {item.source}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {results.length === 0 && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">输入关键词搜索反诈知识</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['投资理财诈骗', '反电信网络诈骗法', '刷单诈骗', '杀猪盘', '冒充公检法'].map((kw) => (
              <button
                key={kw}
                onClick={() => { setQuery(kw); }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-primary-50 text-gray-600 hover:text-primary-600 rounded-lg text-sm transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
