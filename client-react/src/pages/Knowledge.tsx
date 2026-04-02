import { useEffect, useState } from 'react';
import { BookOpen, Search, Tag, Loader2, AlertTriangle, ChevronRight, X, Shield, FileText, 
         Lightbulb, Clock, ArrowRight } from 'lucide-react';
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

// 内置案例数据（从百度反诈数据提取的案例）
const builtInCases = [
  {
    id: 'case-1',
    title: '网络游戏诈骗',
    category: '网络诈骗',
    summary: '周某在游戏中收到好友信息，称要购买其账号。在第三方平台交易后无法提现，被要求缴纳各种解冻费用，共损失5501元。',
    content: `事件经过：周某在游戏中收到一个好友信息，称看到周某要卖账号，可以500元购买他的账号，喜出望外的周某加了对方好友，并同意在第三方平台交易，在平台上搜索"创购得"可以看到交易平台，对方下单交易完成后，周某发现无法提现，进入页面发现自己的账户被冻结，联系客服告知银行卡输入错误无法到账，需要先交500元解冻，就可以连同交易账号的500元一起提现，但是周某交完金额后还是不能提现，再次联系客服告知充值不能是整数，需要再交501元激活提现功能，前前后后共充值5501元，结果第二天发现账号还是不能解冻，联系客服告知需要再充值2万元才可以。`,
    tips: ['不要轻信"低价充值"和"高价收购"', '交易游戏装备和账号一定要在官方平台', '被骗后第一时间报警'],
    riskLevel: 'high'
  },
  {
    id: 'case-2',
    title: '冒充国家反诈中心邮箱诈骗',
    category: '冒充身份',
    summary: '张女士因兼职刷单被骗后，在网上找到假冒的反诈中心邮箱求助，被假冒警察骗取银行卡信息，损失4.6万元。',
    content: `事件经过：张女士因为兼职刷单损失近2000元，于是决定报警，在网上看到一篇"被骗了钱怎么报警"的文章，文章中清楚告知如何报警追回损失，并给出了反诈中心举报受理邮箱，张女士信以为真发送邮件咨询，随后对方告知添加网警QQ进行调查，添加后假冒的警察告知当前张女士的银行卡存在安全隐患，需要提供一张有金额的银行卡做为安全卡，会把追回的钱转到银行卡，于是在诈骗份子的引导下发送了个人以及银行卡信息，随后收到银行扣费提示。`,
    tips: ['国家反诈中心没有举报受理QQ号和邮箱', '遇到诈骗问题请拨打96110咨询', '国家反诈中心不会索要个人财产信息'],
    riskLevel: 'critical'
  },
  {
    id: 'case-3',
    title: '网络金融理财诈骗',
    category: '投资理财',
    summary: '黄某被陌生人拉入微信群，下载虚假投资APP，以"高收益、稳赚不赔"诱导多次转账，最终APP无法打开，损失11077元。',
    content: `事件经过：黄某与一陌生人通过私信聊天，逐渐被对方所说的高收益，稳赚不赔的投资方式所吸引，于是被该人员拉入微信群，随后通过群里点击链接下载了一款某平台APP投资理财软件，后在该平台客服的提示和引导下，多次转账到对方指定的银行卡账户进行投资理财，对方称投资的本金和回报到时候会返还到黄某的资金账户。到了第二次黄某觉得赚了不少想要提现的时候却不能提现，联系客服询问情况，平台客服以各种理由诱导受害人追加投资，最后APP无法打开。`,
    tips: ['不要轻信"高利率"理财产品', '不要被"投资专家、稳赚不赔"迷惑', '不要通过不明链接下载理财APP'],
    riskLevel: 'high'
  },
  {
    id: 'case-4',
    title: '刷单返利诈骗',
    category: '刷单返利',
    summary: '邢某被拉入"福利群"，下载虚假APP后按要求转账做任务，被告知操作失误需继续转账，共损失约2万元。',
    content: `事件经过：邢某通过私信被拉入一个沟通群，群内有人称这是一个拼多多福利群，只需要完成简单任务就可以获得返利，邢某下载"PDD商家"后注册账户，该App客服和接待员联系邢某告知转账返利任务的流程，邢某按照对方要求操作，使用手机银行向对方提供的不同账号进行转账（第一笔1199元，第二笔599元，第三笔17985元）后，对方称邢某点赞操作失误让继续转账，邢某发现被骗。`,
    tips: ['通过平台交易要详细了解商家真实信息', '交易必须有第三方权威机构担保', '对异常低价商品提高警惕'],
    riskLevel: 'high'
  },
  {
    id: 'case-5',
    title: '网络婚恋交友诈骗',
    category: '杀猪盘',
    summary: '黄某在平台被私信诱导下载APP，以"完成任务免费相亲"为由，被要求支付会员费、任务费等，共损失4000余元。',
    content: `事件经过：黄某在某平台被私信加好友，对方发来一个网址：称完成任务免费提供美女相亲，黄某点击该网址下载了APP，APP内匹配接待员-子涵称需先办理会员，黄某未多想通过支付宝扫码的方式向对方提供的二维码支付了100元办理了该会员，后该APP客服称完成三个任务就能给黄某安排美女，如不想完成任务可交钱跳过，黄某信以为真向对方提供的招商银行转账1314元的任务活动费跳过三个任务，但对方称黄某违规操作，需要重新完成三个任务，黄某就再次支付三个任务的费用1314元。`,
    tips: ['不要轻信网络交友平台', '交友平台建议前往实体门店核实', '交友网站虚假内容极多，谨慎付款'],
    riskLevel: 'medium'
  },
  {
    id: 'case-6',
    title: '投资期货诈骗',
    category: '投资理财',
    summary: '潘某被拉入理财群，在"理财专家"引导下下载虚假期货APP投入10万元，最终APP无法打开，血本无归。',
    content: `事件经过：潘某通过私信被拉入一个理财沟通群，群里有人向潘某发送好友请求，潘某通过后，就互相聊天，并聊到了股票投资，对方称行情不好，并推荐潘某做理财。对方称微信聊股票期货太敏感，让潘某下载理财APP，然后双方就在该APP上聊投资期货的事情，并发给潘某一个网站，告知潘某把网址复制到浏览器打开，注册MT5账户。因为潘某对期货一点都不懂，看到群里说都赚到钱了，投资少，周期短，于是潘某也投入了10万元，后期APP无法打开，血本无归。`,
    tips: ['不要轻信"高利率"理财产品', '投资认准官方网站和有ICP备案网站', '先了解公司真实性避免上当'],
    riskLevel: 'critical'
  }
];

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
  const [selectedCase, setSelectedCase] = useState<typeof builtInCases[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'cases'>('cases');

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

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return '极高风险';
      case 'high': return '高风险';
      case 'medium': return '中等风险';
      default: return '风险';
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 
                      flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">反诈知识库</h1>
          <p className="text-sm text-slate-500">学习反诈知识，守护财产安全</p>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'cases'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            典型案例
          </span>
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'knowledge'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            知识条目
          </span>
        </button>
      </div>

      {/* 案例展示 */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          {/* 案例卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {builtInCases.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => setSelectedCase(caseItem)}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 
                         transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getRiskBadge(caseItem.riskLevel)}`}>
                    {getRiskLabel(caseItem.riskLevel)}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                    {caseItem.category}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                  {caseItem.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-3 mb-4">
                  {caseItem.summary}
                </p>
                <div className="flex items-center text-emerald-600 text-sm font-medium">
                  <span>查看详情</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          {/* 安全提示卡片 */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800 mb-2">防骗小贴士</h3>
                <ul className="text-sm text-amber-700 space-y-1.5">
                  <li>• 不轻信陌生来电，公检法机关不会电话办案</li>
                  <li>• 不点击不明链接，谨防钓鱼网站</li>
                  <li>• 不向陌生账户转账，任何理由都不行</li>
                  <li>• 遇到可疑情况，立即拨打 <span className="font-bold">96110</span> 咨询</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 知识库搜索 */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* 搜索区域 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入关键词搜索（默认显示全部）"
                className="flex-1 min-w-[200px] px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 
                         focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 
                         focus:border-emerald-500 outline-none"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button 
                onClick={() => handleSearch()} 
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 
                         text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                搜索
              </button>
              <button 
                onClick={handleBootstrap} 
                disabled={bootstrapping}
                className="px-4 py-3 border border-emerald-200 text-emerald-700 rounded-xl font-medium 
                         flex items-center gap-2 disabled:opacity-50 hover:bg-emerald-50 transition-colors"
              >
                {bootstrapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                初始化知识库
              </button>
            </div>

            {/* 分类快速筛选 */}
            <div className="flex gap-2 flex-wrap">
              {categories.slice(1).map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setCategory(c.value); handleSearch(query, c.value); }}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                    category === c.value
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'
                  }`}
                >
                  <Tag className="w-3 h-3 inline mr-1" />{c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 搜索结果 */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-400">搜索中...</p>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <BookOpen className="w-12 h-12 mx-auto opacity-50" />
              <p className="font-medium">未找到相关知识条目</p>
              <p className="text-sm">可点击"初始化知识库"导入内置反诈知识</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">共 {results.length} 条知识</p>
              {results.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden 
                           cursor-pointer hover:shadow-md transition-all"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-slate-800">{item.title}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.similarity !== undefined && (
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${similarityColor(item.similarity)}`}>
                            {(item.similarity * 100).toFixed(0)}% 匹配
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm text-slate-600 leading-relaxed ${expanded === item.id ? '' : 'line-clamp-2'}`}>
                      {item.content}
                    </p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        {item.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 案例详情弹窗 */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCase(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-slide-up">
            {/* 头部 */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getRiskBadge(selectedCase.riskLevel)}`}>
                  {getRiskLabel(selectedCase.riskLevel)}
                </span>
                <span className="text-sm text-slate-500">{selectedCase.category}</span>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">{selectedCase.title}</h2>
              
              {/* 案例概述 */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                <p className="text-slate-600 leading-relaxed">{selectedCase.summary}</p>
              </div>

              {/* 详细经过 */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  案件经过
                </h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{selectedCase.content}</p>
                </div>
              </div>

              {/* 防范建议 */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200">
                <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  防范建议
                </h3>
                <ul className="space-y-2">
                  {selectedCase.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-emerald-700">
                      <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 底部提示 */}
              <div className="mt-6 text-center text-sm text-slate-400">
                如遇类似情况，请立即拨打全国反诈热线 <span className="text-red-500 font-bold">96110</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
