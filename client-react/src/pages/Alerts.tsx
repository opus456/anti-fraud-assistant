import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ScrollReveal, StaggerContainer, StaggerItem, HoverCard, AnimatedCounter } from '../components/motion';
import api from '../api';
import toast from 'react-hot-toast';

// 预警工单类型
interface AlertRecord {
  id: number;
  user_id: number;
  username?: string;
  nickname?: string;
  fraud_type: string;
  risk_level: number;  // 0=安全, 1=中风险, 2=高风险, 3=极高风险
  risk_score: number;
  message: string;
  title?: string;
  description?: string;
  alert_type?: string;
  report_json?: {
    input_content?: string;
    fraud_type_label?: string;
    ward_nickname?: string;
    ward_username?: string;
    [key: string]: any;
  };
  source: 'call' | 'message' | 'detection' | 'manual';
  is_resolved: boolean;
  guardian_notified: boolean;
  resolved_at?: string;
  created_at: string;
}

// 统计数据
interface AlertStats {
  total: number;
  pending: number;
  resolved: number;
  high_risk: number;
  medium_risk: number;
}

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') as 'all' | 'pending' | 'resolved' || 'all';
  
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [stats, setStats] = useState<AlertStats>({ total: 0, pending: 0, resolved: 0, high_risk: 0, medium_risk: 0 });
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  // 加载预警数据
  const loadAlerts = async () => {
    setLoading(true);
    try {
      // 尝试从后端加载真实数据
      const res = await api.get('/alerts/').catch(() => null);
      
      if (res?.data && res.data.length > 0) {
        // 映射后端数据到前端格式
        const mappedAlerts = res.data.map((item: any) => ({
          ...item,
          message: item.description || item.title || '检测到可疑行为',
          source: 'detection' as const,
        }));
        setAlerts(mappedAlerts);
        calculateStats(mappedAlerts);
      } else {
        // 如果没有数据，使用占位数据
        const mockAlerts: AlertRecord[] = [
          {
            id: 1,
            user_id: 1,
            nickname: '爷爷',
            username: 'grandpa',
            fraud_type: '投资诈骗',
            risk_level: 2,  // 高风险
            risk_score: 0.92,
            message: '来自400-888-9999的通话中提及"稳定高收益投资"，符合投资诈骗特征。已自动拦截并通知监护人。',
            source: 'call',
            is_resolved: false,
            guardian_notified: true,
            created_at: new Date(Date.now() - 10 * 60000).toISOString(),
          },
          {
            id: 2,
            user_id: 1,
            nickname: '奶奶',
            username: 'grandma',
            fraud_type: '刷单诈骗',
            risk_level: 1,  // 中风险
            risk_score: 0.68,
            message: '短信内容包含"日结工资"、"在家赚钱"等关键词，疑似刷单诈骗。',
            source: 'message',
            is_resolved: false,
            guardian_notified: false,
            created_at: new Date(Date.now() - 60 * 60000).toISOString(),
          },
          {
            id: 3,
            user_id: 2,
            nickname: '爷爷',
            username: 'grandpa',
            fraud_type: '冒充公检法',
            risk_level: 3,  // 极高风险
            risk_score: 0.88,
            message: '检测到通话中有"涉及案件"、"配合调查"等诱导性话术。已标记并发送预警。',
            source: 'call',
            is_resolved: true,
            guardian_notified: true,
            resolved_at: new Date(Date.now() - 30 * 60000).toISOString(),
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
        ];
        setAlerts(mockAlerts);
        calculateStats(mockAlerts);
      }
    } catch (err) {
      console.error('加载预警失败:', err);
      toast.error('加载预警数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算统计
  const calculateStats = (data: AlertRecord[]) => {
    setStats({
      total: data.length,
      pending: data.filter(a => !a.is_resolved).length,
      resolved: data.filter(a => a.is_resolved).length,
      high_risk: data.filter(a => a.risk_level >= 2).length,  // 2=高风险, 3=极高风险
      medium_risk: data.filter(a => a.risk_level === 1).length,  // 1=中风险
    });
  };

  // 处理预警
  const handleResolve = async (id: number) => {
    setProcessing(id);
    try {
      await api.put(`/alerts/${id}/resolve`).catch(() => {});
      
      setAlerts(alerts.map(alert =>
        alert.id === id
          ? { ...alert, is_resolved: true, resolved_at: new Date().toISOString() }
          : alert
      ));
      
      toast.success('已标记为已处理');
      calculateStats(alerts.map(a => a.id === id ? { ...a, is_resolved: true } : a));
    } catch (err) {
      toast.error('操作失败');
    } finally {
      setProcessing(null);
    }
  };

  // 忽略预警
  const handleDismiss = async (id: number) => {
    if (!confirm('确定要忽略此预警吗？')) return;
    
    setProcessing(id);
    try {
      await api.delete(`/alerts/${id}`).catch(() => {});
      
      setAlerts(alerts.filter(a => a.id !== id));
      toast.success('已忽略');
      calculateStats(alerts.filter(a => a.id !== id));
    } catch (err) {
      toast.error('操作失败');
    } finally {
      setProcessing(null);
    }
  };

  // 通知监护人
  const handleNotifyGuardian = async (alert: AlertRecord) => {
    try {
      await api.post('/guardians/notify', {
        user_id: alert.user_id,
        message: `检测到风险：${alert.fraud_type} - ${alert.message}`,
      }).catch(() => {});
      
      setAlerts(alerts.map(a =>
        a.id === alert.id ? { ...a, guardian_notified: true } : a
      ));
      
      toast.success('已通知监护人');
    } catch (err) {
      toast.error('通知失败');
    }
  };

  // 过滤和搜索
  const filteredAlerts = alerts.filter(alert => {
    // 状态过滤
    if (filter === 'pending' && alert.is_resolved) return false;
    if (filter === 'resolved' && !alert.is_resolved) return false;
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        alert.fraud_type.toLowerCase().includes(query) ||
        alert.message.toLowerCase().includes(query) ||
        alert.nickname?.toLowerCase().includes(query) ||
        alert.username?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // 更新 URL 参数
  const handleFilterChange = (newFilter: 'all' | 'pending' | 'resolved') => {
    setFilter(newFilter);
    if (newFilter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', newFilter);
    }
    setSearchParams(searchParams);
  };

  // 格式化时间 - 正确处理UTC时间
  const formatTime = (dateStr: string): string => {
    // 后端返回的是UTC时间（带Z后缀），JavaScript会自动转为本地时间
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 风险等级样式 - 支持数字和字符串类型
  const getLevelStyles = (level: number | string) => {
    // 标准化为数字
    let numLevel: number;
    if (typeof level === 'string') {
      const levelMap: Record<string, number> = { safe: 0, low: 0, medium: 1, high: 2, critical: 3 };
      numLevel = levelMap[level] ?? 0;
    } else {
      numLevel = level;
    }

    switch (numLevel) {
      case 3:
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          icon: 'bg-red-100 border-red-200 text-red-600',
          border: 'border-l-red-500',
          label: '极高风险',
        };
      case 2:
        return {
          badge: 'bg-orange-100 text-orange-700 border-orange-200',
          icon: 'bg-orange-100 border-orange-200 text-orange-600',
          border: 'border-l-orange-500',
          label: '高风险',
        };
      case 1:
        return {
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
          icon: 'bg-amber-100 border-amber-200 text-amber-600',
          border: 'border-l-amber-500',
          label: '中风险',
        };
      default:
        return {
          badge: 'bg-green-100 text-green-700 border-green-200',
          icon: 'bg-green-100 border-green-200 text-green-600',
          border: 'border-l-green-500',
          label: '安全',
        };
    }
  };

  // 来源图标
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'call': return PhoneIcon;
      case 'message': return ChatBubbleLeftRightIcon;
      default: return BellAlertIcon;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <ScrollReveal>
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">预警中心</h1>
              <p className="text-slate-600 text-sm sm:text-base">管理被守护者的风险预警工单</p>
            </div>
            <button
              onClick={loadAlerts}
              className="btn btn-outline text-sm"
            >
              <ArrowPathIcon className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 统计卡片 */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <div onClick={() => handleFilterChange('pending')} className="cursor-pointer">
            <HoverCard 
              className={`stat-card ${filter === 'pending' ? 'ring-2 ring-amber-400' : ''}`}
            >
              <div className="stat-icon bg-amber-100">
                <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div className="stat-value text-xl sm:text-2xl text-amber-600">
                <AnimatedCounter value={stats.pending} />
              </div>
              <div className="stat-label text-xs sm:text-sm">待处理</div>
            </HoverCard>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div onClick={() => handleFilterChange('resolved')} className="cursor-pointer">
            <HoverCard 
              className={`stat-card ${filter === 'resolved' ? 'ring-2 ring-green-400' : ''}`}
            >
              <div className="stat-icon bg-green-100">
                <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="stat-value text-xl sm:text-2xl text-green-600">
                <AnimatedCounter value={stats.resolved} />
              </div>
              <div className="stat-label text-xs sm:text-sm">已处理</div>
            </HoverCard>
          </div>
        </StaggerItem>
        <StaggerItem>
          <HoverCard className="stat-card">
            <div className="stat-icon bg-red-100">
              <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div className="stat-value text-xl sm:text-2xl text-red-600">
              <AnimatedCounter value={stats.high_risk} />
            </div>
            <div className="stat-label text-xs sm:text-sm">高风险</div>
          </HoverCard>
        </StaggerItem>
        <StaggerItem>
          <div onClick={() => handleFilterChange('all')} className="cursor-pointer">
            <HoverCard 
              className={`stat-card ${filter === 'all' ? 'ring-2 ring-sky-400' : ''}`}
            >
              <div className="stat-icon bg-sky-100">
                <BellAlertIcon className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
              </div>
              <div className="stat-value text-xl sm:text-2xl">
                <AnimatedCounter value={stats.total} />
              </div>
              <div className="stat-label text-xs sm:text-sm">全部</div>
            </HoverCard>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* 筛选和搜索 */}
      <ScrollReveal delay={0.2}>
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            {/* 筛选标签 */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-slate-400" />
              <div className="flex gap-2">
                {[
                  { id: 'all', label: '全部', count: stats.total },
                  { id: 'pending', label: '待处理', count: stats.pending },
                  { id: 'resolved', label: '已处理', count: stats.resolved },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleFilterChange(item.id as typeof filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filter === item.id
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                    <span className="ml-1 opacity-75">({item.count})</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 搜索框 */}
            <div className="relative flex-1 w-full sm:w-auto sm:max-w-xs ml-auto">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索预警..."
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>
          </div>

          {/* 预警列表 */}
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {filteredAlerts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <ShieldCheckIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500">
                    {filter === 'pending' ? '没有待处理的预警' : 
                     filter === 'resolved' ? '没有已处理的预警' :
                     searchQuery ? '没有匹配的预警' : '暂无预警信息'}
                  </p>
                  {filter !== 'all' && (
                    <button
                      onClick={() => handleFilterChange('all')}
                      className="mt-3 text-sky-600 hover:text-sky-700 text-sm"
                    >
                      查看全部预警
                    </button>
                  )}
                </motion.div>
              ) : (
                filteredAlerts.map((alert) => {
                  const SourceIcon = getSourceIcon(alert.source);
                  const levelStyles = getLevelStyles(alert.risk_level);
                  
                  return (
                    <motion.div
                      key={alert.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 sm:p-5 rounded-xl border-l-4 bg-slate-50 hover:bg-slate-100 transition-all duration-200 hover:shadow-sm ${levelStyles.border}`}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        {/* 图标 */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${levelStyles.icon}`}>
                          <SourceIcon className="w-6 h-6" />
                        </div>
                        
                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          {/* 头部信息 */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${levelStyles.badge}`}>
                              {levelStyles.label}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                              {alert.fraud_type}
                            </span>
                            {alert.guardian_notified && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                                已通知监护人
                              </span>
                            )}
                            {alert.is_resolved && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                已处理
                              </span>
                            )}
                          </div>
                          
                          {/* 用户信息 */}
                          {(alert.nickname || alert.username) && (
                            <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
                              <UserIcon className="w-4 h-4" />
                              <span>被守护者: {alert.nickname || alert.username}</span>
                            </div>
                          )}
                          
                          {/* 消息内容 */}
                          <p className="text-slate-700 text-sm sm:text-base mb-2">{alert.message}</p>
                          
                          {/* 时间信息 */}
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {formatTime(alert.created_at)}
                            </span>
                            {alert.resolved_at && (
                              <span className="flex items-center gap-1">
                                <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
                                处理于 {formatTime(alert.resolved_at)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                          {!alert.is_resolved && (
                            <>
                              <button
                                onClick={() => handleResolve(alert.id)}
                                disabled={processing === alert.id}
                                className="flex-1 sm:flex-none btn btn-safe text-sm py-2"
                              >
                                {processing === alert.id ? (
                                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircleIcon className="w-4 h-4" />
                                )}
                                <span className="sm:hidden md:inline">处理</span>
                              </button>
                              {!alert.guardian_notified && (
                                <button
                                  onClick={() => handleNotifyGuardian(alert)}
                                  className="flex-1 sm:flex-none btn btn-outline text-sm py-2"
                                >
                                  <BellAlertIcon className="w-4 h-4" />
                                  <span className="sm:hidden md:inline">通知</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDismiss(alert.id)}
                                disabled={processing === alert.id}
                                className="btn btn-ghost text-red-500 hover:bg-red-50 text-sm py-2"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {alert.is_resolved && (
                            <Link
                              to={`/history?id=${alert.id}`}
                              className="btn btn-ghost text-sm py-2"
                            >
                              查看详情
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </AnimatePresence>
        </div>
      </ScrollReveal>

      {/* 底部说明 */}
      {stats.pending > 0 && (
        <ScrollReveal delay={0.4}>
          <div className="card bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 text-sm font-medium">有 {stats.pending} 条待处理预警</p>
                <p className="text-amber-700 text-xs mt-1">请及时处理高风险预警，保护被守护者的财产安全。</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
