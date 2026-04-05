import { useState } from 'react';
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PlayCircleIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  
} from '@heroicons/react/24/outline';

interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  type: 'article' | 'video' | 'case';
  readTime?: string;
  views: number;
  tags: string[];
}

const categories = [
  { id: 'all', label: '全部' },
  { id: 'investment', label: '投资理财诈骗' },
  { id: 'job', label: '兼职刷单诈骗' },
  { id: 'impersonation', label: '冒充类诈骗' },
  { id: 'romance', label: '网络婚恋诈骗' },
  { id: 'loan', label: '虚假贷款诈骗' },
];

const knowledgeItems: KnowledgeItem[] = [
  { id: '1', title: '识别投资理财诈骗的10个警示信号', category: 'investment', type: 'article', readTime: '5分钟', views: 1234, tags: ['投资', '理财', '高收益'] },
  { id: '2', title: '刷单返利骗局全解析', category: 'job', type: 'video', views: 2345, tags: ['兼职', '刷单', '返利'] },
  { id: '3', title: '冒充公检法诈骗案例分析', category: 'impersonation', type: 'case', readTime: '8分钟', views: 987, tags: ['公检法', '冻结账户'] },
  { id: '4', title: '杀猪盘：网络婚恋诈骗深度剖析', category: 'romance', type: 'article', readTime: '10分钟', views: 3456, tags: ['网恋', '杀猪盘'] },
  { id: '5', title: '虚假贷款APP骗局揭秘', category: 'loan', type: 'video', views: 1567, tags: ['贷款', 'APP'] },
  { id: '6', title: '如何识别AI换脸诈骗', category: 'impersonation', type: 'article', readTime: '6分钟', views: 4321, tags: ['AI', '换脸', '视频'] },
];

export default function Knowledge() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = knowledgeItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.tags.some(tag => tag.includes(searchTerm));
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return PlayCircleIcon;
      case 'case': return AcademicCapIcon;
      default: return DocumentTextIcon;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return '视频';
      case 'case': return '案例';
      default: return '文章';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="content-header">
        <h1 className="page-title">反诈知识库</h1>
        <p className="page-subtitle">学习防骗知识，提高安全意识</p>
      </div>

      {/* 搜索栏 */}
      <div className="card">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索知识库..."
            className="input pl-12"
          />
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-100 text-text-body hover:bg-surface-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 知识列表 */}
      <div className="card-grid-2">
        {filteredItems.map((item) => {
          const TypeIcon = getTypeIcon(item.type);
          
          return (
            <div key={item.id} className="card card-hover group cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-card bg-primary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500 transition-colors">
                  <TypeIcon className="w-7 h-7 text-primary-500 group-hover:text-white transition-colors" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="status-badge status-neutral text-xs">
                      {getTypeLabel(item.type)}
                    </span>
                    {item.readTime && (
                      <span className="text-xs text-text-muted">{item.readTime}</span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-text-title group-hover:text-primary-500 transition-colors truncate-2">
                    {item.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-3">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-xs text-text-muted bg-surface-100 px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 text-sm text-text-muted">
                    <span>{item.views} 次阅读</span>
                    <ChevronRightIcon className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="card text-center py-12">
          <BookOpenIcon className="w-16 h-16 mx-auto text-surface-300 mb-4" />
          <p className="text-text-muted">未找到相关内容</p>
        </div>
      )}
    </div>
  );
}

