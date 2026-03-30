import { useEffect, useState } from 'react';
import { BookOpen, Search, Tag, Loader2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  similarity?: number;
  tags?: string[];
}

const categories = [
  { value: '', label: '全部类型' },
  { value: '电信诈骗', label: '电信诈骗' },
  { value: '网络诈骗', label: '网络诈骗' },
  { value: '金融诈骗', label: '金融诈骗' },
  { value: '冒充身份', label: '冒充身份' },
  { value: '投资理财', label: '投资理财' },
  { value: '刷单返利', label: '刷单返利' },
  { value: '杀猪盘', label: '杀猪盘' },
  { value: '其他', label: '其他' },
];

export default function Knowledge() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSearch = async (inputQuery?: string, inputCategory?: string) => {
    const finalCategory = inputCategory ?? category;
    const finalQuery = (inputQuery ?? query).trim();

    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string | number> = { limit: 1000 };
      if (finalCategory) params.category = finalCategory;
      if (finalQuery) params.q = finalQuery;

      const { data } = await api.get('/knowledge/all', { params });
      setResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('');
  }, []);

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      await api.post('/knowledge/bootstrap');
      toast.success('知识库初始化完成');
      await handleSearch(query, category);
    } catch (err: any) {
      toast.error(err.message || '知识库初始化失败');
    } finally {
      setBootstrapping(false);
    }
  };

  const similarityColor = (sim?: number) => {
    if (!sim) return 'bg-gray-100 text-gray-600';
    if (sim >= 0.8) return 'bg-green-100 text-green-700';
    if (sim >= 0.5) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary-600" /> 反诈知识库
      </h1>

      {/* Search area */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入关键词搜索（默认显示全部）"
            className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button onClick={() => handleSearch()} disabled={loading}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            搜索
          </button>
          <button onClick={handleBootstrap} disabled={bootstrapping}
            className="px-4 py-2.5 border border-primary-300 text-primary-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
            {bootstrapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            初始化知识库
          </button>
        </div>

        {/* Category quick filters */}
        <div className="flex gap-2 flex-wrap">
          {categories.slice(1).map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCategory(c.value);
                handleSearch(query, c.value);
              }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                category === c.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
              }`}>
              <Tag className="w-3 h-3 inline mr-1" />{c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">搜索中...</div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-12 text-gray-400 space-y-2">
          <p>未找到相关知识条目</p>
          <p className="text-xs">可点击“初始化知识库”导入内置反诈知识</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">共 {results.length} 条知识</p>
          {results.map((item) => (
            <div key={item.id}
              className="bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-medium text-gray-800">{item.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.similarity !== undefined && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${similarityColor(item.similarity)}`}>
                        {(item.similarity * 100).toFixed(0)}% 匹配
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full">{item.category}</span>
                  </div>
                </div>
                <p className={`text-sm text-gray-600 ${expanded === item.id ? '' : 'line-clamp-2'}`}>
                  {item.content}
                </p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {item.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
