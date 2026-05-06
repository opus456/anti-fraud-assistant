import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  MicrophoneIcon,
  EyeIcon,
  ArrowPathIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import { ScrollReveal, StaggerContainer, StaggerItem, AnimatedCounter } from '../components/motion';

interface HistoryItem {
  id: string;
  type: 'text' | 'image' | 'audio';
  content: string;         // 完整输入内容
  contentPreview: string;  // 内容预览（截断）
  riskLevel: 'safe' | 'warning' | 'danger';
  riskScore: number;
  scamType?: string;
  scamTypeLabel?: string;
  timestamp: string;
  rawTimestamp?: string;   // 原始时间戳
  analysisResult?: string;
  suggestions?: string[];
  cotReasoning?: Record<string, unknown>;
}

// 格式化时间戳
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 将后端风险等级映射为前端格式
function mapRiskLevel(level: string): 'safe' | 'warning' | 'danger' {
  switch (level) {
    case 'high':
    case 'critical': return 'danger';
    case 'medium': return 'warning';
    case 'low':
    default: return 'safe';
  }
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'safe' | 'warning' | 'danger'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 详情弹窗
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // 加载真实检测记录
  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/detection/history?page_size=50').catch(() => null);
      
      if (res?.data && res.data.length > 0) {
        // 转换后端数据格式
        const realHistory: HistoryItem[] = res.data.map((item: any) => ({
          id: String(item.id),
          type: item.input_type === 'image' ? 'image' : item.input_type === 'audio' ? 'audio' : 'text',
          content: item.input_content || '检测内容',
          contentPreview: (item.input_content || '').substring(0, 100),
          riskLevel: mapRiskLevel(item.risk_level),
          riskScore: Math.round((item.risk_score || 0) * 100),
          scamType: item.fraud_type || undefined,
          scamTypeLabel: item.analysis_result?.fraud_type_label || item.fraud_type || undefined,
          timestamp: formatTimestamp(item.created_at),
          rawTimestamp: item.created_at,
          analysisResult: item.analysis_result?.analysis || item.ai_response || '',
          suggestions: item.analysis_result?.suggestions || [],
          cotReasoning: item.analysis_result?.cot_reasoning,
        }));
        // 只显示真实数据，不再追加mock数据
        setHistory(realHistory);
      } else {
        // 无真实数据时显示空列表
        setHistory([]);
      }
    } catch (err) {
      console.error('加载检测记录失败:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // 打开详情弹窗
  const openDetailModal = (item: HistoryItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredHistory = history.filter(item => {
    const matchesFilter = filter === 'all' || item.riskLevel === filter;
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.contentPreview || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return PhotoIcon;
      case 'audio': return MicrophoneIcon;
      default: return ChatBubbleLeftRightIcon;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner - 靛蓝色 */}
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#312e81] via-[#3730a3] to-[#1e1b4b] p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 text-white/[0.03]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex-1">
              <p className="text-white/40 text-sm mb-2 font-medium">Detection History · 检测日志</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-snug">
                检测记录 ·{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 text-4xl sm:text-5xl font-black">
                  <AnimatedCounter value={history.length} />
                </span>
                {' '}条
              </h1>
              <p className="text-white/40 text-sm">查看所有历史检测结果与 AI 分析详情</p>
            </div>
            <button onClick={loadHistory} disabled={loading} className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl text-white text-sm transition-all flex items-center gap-2"><ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />刷新</button>
          </div>
        </div>
      </ScrollReveal>

      {/* 搜索和筛选 */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索记录..."
              className="input pl-12"
            />
          </div>
          
          <div className="flex gap-2">
            {[
              { id: 'all', label: '全部' },
              { id: 'danger', label: '高风险', color: 'danger' },
              { id: 'warning', label: '可疑', color: 'warning' },
              { id: 'safe', label: '安全', color: 'safe' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-4 py-2 rounded-btn font-medium transition-colors ${
                  filter === f.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 text-text-body hover:bg-surface-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="card">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-8 h-8 mx-auto text-primary-400 animate-spin mb-4" />
              <p className="text-text-muted">加载中...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="w-16 h-16 mx-auto text-surface-300 mb-4" />
              <p className="text-text-muted">暂无检测记录</p>
              <p className="text-sm text-slate-500 mt-2">使用检测功能后，记录会显示在这里</p>
            </div>
          ) : (
            <StaggerContainer className="space-y-3">
              {filteredHistory.map((item) => {
                const TypeIcon = getTypeIcon(item.type);
                
                return (
                  <StaggerItem key={item.id}>
                    <div
                      onClick={() => openDetailModal(item)}
                      className="flex items-center gap-4 p-4 rounded-card transition-all hover:shadow-md cursor-pointer bg-white border-l-4 border-l-primary-500 hover:bg-slate-200"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        item.type === 'text' ? 'bg-primary-100' :
                        item.type === 'image' ? 'bg-warning-100' : 'bg-safe-100'
                      }`}>
                        <TypeIcon className={`w-6 h-6 ${
                          item.type === 'text' ? 'text-primary-500' :
                          item.type === 'image' ? 'text-warning-500' : 'text-safe-500'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-text-title font-medium truncate">{item.contentPreview || item.content}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-text-muted">{item.timestamp}</span>
                          {(item.scamTypeLabel || item.scamType) && (
                            <span className={`status-badge text-xs ${
                              item.riskLevel === 'danger' ? 'status-danger' :
                              item.riskLevel === 'warning' ? 'status-warning' : 'status-safe'
                            }`}>
                              {item.scamTypeLabel || item.scamType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            item.riskLevel === 'danger' ? 'text-danger-500' :
                            item.riskLevel === 'warning' ? 'text-warning-500' : 'text-safe-500'
                          }`}>
                            {item.riskScore}
                          </div>
                          <div className="text-xs text-text-muted">风险值</div>
                        </div>
                        
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openDetailModal(item); }}
                            className="btn btn-icon btn-ghost" 
                            title="查看详情"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {showDetailModal && selectedItem && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="p-6 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedItem.riskLevel === 'danger' ? (
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-rose-600" />
                      </div>
                    ) : selectedItem.riskLevel === 'warning' ? (
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">检测详情</h2>
                      <p className="text-sm text-slate-500">{selectedItem.timestamp}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDetailModal(false)} 
                    className="text-slate-500 hover:text-slate-500 p-2"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* 内容区域 - 可滚动 */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* 风险评估 */}
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      selectedItem.riskLevel === 'danger' ? 'text-rose-600' :
                      selectedItem.riskLevel === 'warning' ? 'text-amber-500' : 'text-emerald-600'
                    }`}>
                      {selectedItem.riskScore}
                    </div>
                    <div className="text-xs text-slate-500">风险分数</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                        selectedItem.riskLevel === 'danger' ? 'bg-rose-50 text-red-700' :
                        selectedItem.riskLevel === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {selectedItem.riskLevel === 'danger' ? '高风险' :
                         selectedItem.riskLevel === 'warning' ? '可疑' : '安全'}
                      </span>
                      {(selectedItem.scamTypeLabel || selectedItem.scamType) && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-sm">
                          {selectedItem.scamTypeLabel || selectedItem.scamType}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      检测类型: {selectedItem.type === 'text' ? '文本' : selectedItem.type === 'image' ? '图片' : '音频'}
                    </div>
                  </div>
                </div>

                {/* 检测内容 */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    检测内容
                  </h3>
                  <div className="p-4 bg-white rounded-xl text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedItem.content || '无内容'}
                  </div>
                </div>

                {/* AI分析结果 */}
                {selectedItem.analysisResult && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <LightBulbIcon className="w-4 h-4" />
                      AI分析结果
                    </h3>
                    <div className="p-4 bg-accent-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">
                      {selectedItem.analysisResult}
                    </div>
                  </div>
                )}

                {/* 安全建议 */}
                {selectedItem.suggestions && selectedItem.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <ShieldCheckIcon className="w-4 h-4" />
                      安全建议
                    </h3>
                    <ul className="space-y-2">
                      {selectedItem.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg text-sm text-slate-700">
                          <span className="text-emerald-600 mt-0.5">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 底部 */}
              <div className="p-4 bg-white border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn btn-primary"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

