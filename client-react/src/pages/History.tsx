import { useState } from 'react';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  MicrophoneIcon,
  
  
  TrashIcon,
  EyeIcon,
  
} from '@heroicons/react/24/outline';

interface HistoryItem {
  id: string;
  type: 'text' | 'image' | 'audio';
  content: string;
  riskLevel: 'safe' | 'warning' | 'danger';
  riskScore: number;
  scamType?: string;
  timestamp: string;
}

const mockHistory: HistoryItem[] = [
  { id: '1', type: 'text', content: '您好，我是XX银行客服，您的账户存在异常...', riskLevel: 'danger', riskScore: 95, scamType: '冒充银行诈骗', timestamp: '今天 10:30' },
  { id: '2', type: 'image', content: '投资理财截图', riskLevel: 'warning', riskScore: 72, scamType: '投资诈骗', timestamp: '今天 09:15' },
  { id: '3', type: 'text', content: '恭喜您中奖100万，请点击链接领取...', riskLevel: 'danger', riskScore: 98, scamType: '中奖诈骗', timestamp: '昨天 15:42' },
  { id: '4', type: 'audio', content: '通话录音 - 2分34秒', riskLevel: 'safe', riskScore: 12, timestamp: '昨天 14:20' },
  { id: '5', type: 'text', content: '你好，请问明天有空一起吃饭吗？', riskLevel: 'safe', riskScore: 3, timestamp: '昨天 10:00' },
];

export default function History() {
  const [history, setHistory] = useState(mockHistory);
  const [filter, setFilter] = useState<'all' | 'safe' | 'warning' | 'danger'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(item => {
    const matchesFilter = filter === 'all' || item.riskLevel === filter;
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return PhotoIcon;
      case 'audio': return MicrophoneIcon;
      default: return ChatBubbleLeftRightIcon;
    }
  };

  const deleteItem = (id: string) => {
    setHistory(history.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="content-header">
        <h1 className="page-title">检测记录</h1>
        <p className="page-subtitle">查看历史检测结果</p>
      </div>

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
          {filteredHistory.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-card bg-surface-50 hover:bg-surface-100 transition-colors"
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
                  <p className="text-text-title font-medium truncate">{item.content}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-text-muted">{item.timestamp}</span>
                    {item.scamType && (
                      <span className={`status-badge text-xs ${
                        item.riskLevel === 'danger' ? 'status-danger' :
                        item.riskLevel === 'warning' ? 'status-warning' : 'status-safe'
                      }`}>
                        {item.scamType}
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
                    <button className="btn btn-icon btn-ghost">
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="btn btn-icon btn-ghost text-danger-500 hover:bg-danger-50"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredHistory.length === 0 && (
            <div className="text-center py-12">
              <ClockIcon className="w-16 h-16 mx-auto text-surface-300 mb-4" />
              <p className="text-text-muted">暂无检测记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

