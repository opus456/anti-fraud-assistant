/**
 * 反诈知识库 - 官方案例与教育资源
 * 数据来源：公安部、最高检、央视等官方渠道
 */

export interface KnowledgeArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'article' | 'video' | 'case';
  source: string;
  sourceIcon?: string;
  url: string;
  thumbnail?: string;
  publishDate?: string;
  tags: string[];
  featured?: boolean;
  readTime?: string;
}

export const knowledgeCategories = [
  { id: 'all', label: '全部', icon: '📚' },
  { id: 'telecom', label: '电信网络诈骗', icon: '📱' },
  { id: 'romance', label: '杀猪盘/婚恋诈骗', icon: '💔' },
  { id: 'job', label: '刷单返利诈骗', icon: '💰' },
  { id: 'loan', label: '虚假贷款诈骗', icon: '🏦' },
  { id: 'ai', label: 'AI换脸诈骗', icon: '🤖' },
  { id: 'investment', label: '投资理财诈骗', icon: '📈' },
];

// 官方真实案例数据
export const knowledgeArticles: KnowledgeArticle[] = [
  // =============== 官方提供的真实案例 ===============
  {
    id: 'official-1',
    title: '公安部公布十大高发电信网络诈骗案例',
    description: '公安部发布的典型电信网络诈骗案例，包括冒充公检法、虚假投资理财、刷单返利等多种类型，深入剖析诈骗手法与防范要点。',
    category: 'telecom',
    type: 'case',
    source: '公安部',
    sourceIcon: '🚔',
    url: 'http://www.mps.gov.cn:8080/n2253534/n2253535/c9077804/content.html',
    publishDate: '2023-06-15',
    tags: ['公安部', '电信诈骗', '典型案例', '官方发布'],
    featured: true,
    readTime: '15分钟',
  },
  {
    id: 'official-2',
    title: '"杀猪盘"诈骗真实案例：情感陷阱如何让受害者血本无归',
    description: '中国长安网发布的杀猪盘诈骗深度案例分析，揭示诈骗分子如何通过网络交友、培养感情、诱导投资等步骤实施诈骗。',
    category: 'romance',
    type: 'case',
    source: '中国长安网',
    sourceIcon: '⚖️',
    url: 'http://www.chinapeace.gov.cn/chinapeace/c100007/2022-07/13/content_12647719.shtml',
    publishDate: '2022-07-13',
    tags: ['杀猪盘', '网恋诈骗', '投资陷阱', '情感诈骗'],
    featured: true,
    readTime: '12分钟',
  },
  {
    id: 'official-3',
    title: '央视揭秘：刷单返现诈骗全过程实录',
    description: '央视新闻深度报道刷单返利诈骗案例，从受害者亲历视角展示诈骗分子的话术套路和资金转移手法，提醒公众警惕"高薪兼职"陷阱。',
    category: 'job',
    type: 'video',
    source: '央视新闻',
    sourceIcon: '📺',
    url: 'https://content-static.cctvnews.cctv.com/snow-book/index.html?item_id=2882316236491908069',
    publishDate: '2023-08-20',
    tags: ['刷单诈骗', '兼职陷阱', '央视报道', '视频案例'],
    featured: true,
    readTime: '8分钟',
  },
  {
    id: 'official-4',
    title: '虚假贷款APP诈骗案例：警惕"低息贷款"背后的陷阱',
    description: '中国经济网报道的虚假贷款APP诈骗案例，揭露不法分子如何利用虚假贷款APP骗取"手续费"、"保证金"等费用。',
    category: 'loan',
    type: 'article',
    source: '中国经济网',
    sourceIcon: '📰',
    url: 'http://finance.ce.cn/bank12/scroll/202303/16/t20230316_38445319.shtml',
    publishDate: '2023-03-16',
    tags: ['贷款诈骗', '虚假APP', '手续费骗局', '网贷陷阱'],
    featured: true,
    readTime: '10分钟',
  },
  {
    id: 'official-5',
    title: '最高检发布：AI换脸诈骗典型案例与防范指南',
    description: '最高人民检察院发布的AI深度伪造诈骗典型案例，展示不法分子如何利用AI技术伪造视频通话实施诈骗，并提供防范建议。',
    category: 'ai',
    type: 'video',
    source: '最高人民检察院',
    sourceIcon: '⚖️',
    url: 'https://www.spp.gov.cn/spp/sp/202309/t20230913_628029.shtml',
    publishDate: '2023-09-13',
    tags: ['AI换脸', '深度伪造', '视频诈骗', '最高检'],
    featured: true,
    readTime: '10分钟',
  },

  // =============== 补充的教育内容 ===============
  {
    id: 'edu-1',
    title: '投资理财诈骗的10大警示信号',
    description: '学会识别投资理财诈骗的常见特征：承诺高收益低风险、要求私下转账、冒充正规平台等。掌握这些知识，远离投资陷阱。',
    category: 'investment',
    type: 'article',
    source: '反诈知识库',
    url: '',
    tags: ['投资诈骗', '理财陷阱', '风险识别'],
    readTime: '5分钟',
  },
  {
    id: 'edu-2',
    title: '如何识别冒充公检法诈骗',
    description: '公检法机关绝不会通过电话要求转账！了解冒充公检法诈骗的常见话术和识别方法，保护自己和家人的财产安全。',
    category: 'telecom',
    type: 'article',
    source: '反诈知识库',
    url: '',
    tags: ['冒充公检法', '电话诈骗', '防骗指南'],
    readTime: '6分钟',
  },
  {
    id: 'edu-3',
    title: '网络兼职诈骗套路全解析',
    description: '深入解析"刷单返利"、"点赞赚钱"等网络兼职诈骗套路。记住：先交钱后做任务的兼职都是诈骗！',
    category: 'job',
    type: 'article',
    source: '反诈知识库',
    url: '',
    tags: ['网络兼职', '刷单诈骗', '套路解析'],
    readTime: '7分钟',
  },
  {
    id: 'edu-4',
    title: '老年人防诈骗指南：守护父母的养老钱',
    description: '针对老年群体的专项防诈指南，涵盖保健品诈骗、养老投资诈骗、冒充亲友诈骗等常见类型，帮助子女保护父母。',
    category: 'telecom',
    type: 'article',
    source: '反诈知识库',
    url: '',
    tags: ['老年防诈', '养老诈骗', '家庭守护'],
    readTime: '8分钟',
  },
  {
    id: 'edu-5',
    title: '学生群体网络诈骗防范手册',
    description: '针对学生群体的防诈骗教育内容，包括校园贷诈骗、游戏诈骗、虚假中奖等学生常遇到的诈骗类型。',
    category: 'loan',
    type: 'article',
    source: '反诈知识库',
    url: '',
    tags: ['学生防诈', '校园贷', '游戏诈骗'],
    readTime: '6分钟',
  },
  {
    id: 'edu-6',
    title: 'AI时代的新型诈骗：深度伪造技术的威胁',
    description: '了解AI换脸、声音克隆等深度伪造技术在诈骗中的应用。学会通过提问验证、回拨确认等方式识别AI伪造。',
    category: 'ai',
    type: 'article',
    source: '反诈知识库',
    url: '',
    tags: ['AI诈骗', '深度伪造', '声音克隆', '防范技巧'],
    readTime: '9分钟',
  },
];

// 获取精选内容（官方案例）
export const getFeaturedArticles = () => 
  knowledgeArticles.filter(article => article.featured);

// 按分类获取内容
export const getArticlesByCategory = (categoryId: string) => 
  categoryId === 'all' 
    ? knowledgeArticles 
    : knowledgeArticles.filter(article => article.category === categoryId);

// 搜索内容
export const searchArticles = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return knowledgeArticles.filter(article => 
    article.title.toLowerCase().includes(lowerQuery) ||
    article.description.toLowerCase().includes(lowerQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};
