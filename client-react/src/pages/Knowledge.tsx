import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PlayCircleIcon,
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  StarIcon,
  TagIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { ScrollReveal, StaggerContainer, StaggerItem, HoverCard } from '../components/motion';
import { 
  knowledgeCategories, 
  knowledgeArticles, 
  getFeaturedArticles,
  type KnowledgeArticle 
} from '../data/knowledgeBase';

export default function Knowledge() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showFeaturedOnly] = useState(false);

  // 过滤逻辑
  const filteredItems = knowledgeArticles.filter(item => {
    // 搜索过滤
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 分类过滤
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    
    // 精选过滤
    const matchesFeatured = !showFeaturedOnly || item.featured;
    
    return matchesSearch && matchesCategory && matchesFeatured;
  });

  // 精选内容
  const featuredArticles = getFeaturedArticles();

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-purple-500/15 text-purple-700 border-purple-200';
      case 'case': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-sky-100 text-sky-700 border-sky-200';
    }
  };

  // 打开外部链接
  const handleOpenArticle = (article: KnowledgeArticle) => {
    if (article.url) {
      window.open(article.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner - 紫色 */}
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#3b0764] p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-accent-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 text-white/[0.03]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex-1">
              <p className="text-white/40 text-sm mb-2 font-medium">Knowledge Base · 安全知识</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">反诈知识库</h1>
              <p className="text-white/40 text-sm">学习防骗知识，提高安全意识 · {knowledgeArticles.length} 篇内容</p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 精选官方案例轮播 */}
      <ScrollReveal delay={0.1}>
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <StarIconSolid className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">官方权威案例</h2>
            <span className="text-xs text-slate-500 ml-auto">来自公安部、最高检、央视等</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredArticles.slice(0, 3).map((article, idx) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => handleOpenArticle(article)}
                className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 hover:border-indigo-300 hover:shadow-lg cursor-pointer transition-all"
              >
                {/* 类型标签 */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(article.type)}`}>
                    {article.type === 'video' && '🎬'} {getTypeLabel(article.type)}
                  </span>
                  <span className="text-xs text-slate-500">{article.sourceIcon} {article.source}</span>
                </div>
                
                {/* 标题 */}
                <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h3>
                
                {/* 描述 */}
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                  {article.description}
                </p>
                
                {/* 底部信息 */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {article.readTime}
                  </span>
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 group-hover:text-indigo-500 transition-colors" />
                </div>
                
                {/* 精选角标 */}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                  <StarIcon className="w-3.5 h-3.5 text-white" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* 搜索和筛选 */}
      <ScrollReveal delay={0.2}>
        <div className="card">
          {/* 搜索框 */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索知识库..."
              className="input pl-12"
            />
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2">
            {knowledgeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* 知识列表 */}
      <AnimatePresence mode="popLayout">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            
            return (
              <StaggerItem key={item.id}>
                <HoverCard className="h-full">
                  <div 
                    onClick={() => handleOpenArticle(item)}
                    className={`card group h-full ${item.url ? 'cursor-pointer hover:border-indigo-300' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* 图标 */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.type === 'video' ? 'bg-purple-500/15 group-hover:bg-purple-200' :
                        item.type === 'case' ? 'bg-amber-50 group-hover:bg-amber-200' :
                        'bg-sky-100 group-hover:bg-sky-200'
                      }`}>
                        <TypeIcon className={`w-6 h-6 ${
                          item.type === 'video' ? 'text-purple-600' :
                          item.type === 'case' ? 'text-amber-600' :
                          'text-sky-600'
                        }`} />
                      </div>
                      
                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        {/* 头部信息 */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(item.type)}`}>
                            {getTypeLabel(item.type)}
                          </span>
                          {item.featured && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                              ⭐ 官方
                            </span>
                          )}
                          {item.readTime && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {item.readTime}
                            </span>
                          )}
                        </div>
                        
                        {/* 标题 */}
                        <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                          {item.title}
                        </h3>
                        
                        {/* 描述 */}
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                        
                        {/* 标签 */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <TagIcon className="w-3.5 h-3.5 text-slate-500" />
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        {/* 来源信息 */}
                        {item.source && item.url && (
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                            <span className="text-xs text-slate-500">
                              {item.sourceIcon} {item.source}
                              {item.publishDate && ` · ${item.publishDate}`}
                            </span>
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </HoverCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </AnimatePresence>

      {/* 空状态 */}
      {filteredItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-12"
        >
          <BookOpenIcon className="w-16 h-16 mx-auto text-slate-800 mb-4" />
          <p className="text-slate-500 mb-2">未找到相关内容</p>
          <p className="text-sm text-slate-500">
            {searchTerm ? '尝试其他搜索词' : '请选择其他分类'}
          </p>
          {(searchTerm || activeCategory !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}
              className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm"
            >
              清除筛选条件
            </button>
          )}
        </motion.div>
      )}

      {/* 底部提示 */}
      <ScrollReveal delay={0.4}>
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">温馨提示</h3>
              <p className="text-sm text-amber-600">
                以上案例均来自公安部、最高人民检察院、央视新闻等官方权威渠道。
                如遇可疑情况，请及时拨打全国反诈热线 <span className="font-bold">96110</span> 咨询。
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

