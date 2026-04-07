import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useModeStore } from '../store/modeStore';
import { useAuthStore } from '../store';
import { 
  StaggerContainer, 
  StaggerItem, 
  ScrollReveal, 
  AnimatedCounter,
  HoverCard 
} from '../components/motion';
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  BellAlertIcon,
  ClockIcon,
  BookOpenIcon,
  UserGroupIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  PlayIcon,
  CpuChipIcon,
  ServerIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import toast from 'react-hot-toast';

// 统计数据类型
interface StatisticsOverview {
  total_users: number;
  total_detections: number;
  fraud_detected: number;
  alerts_pending: number;
  alerts_resolved: number;
  today_detections: number;
  today_fraud: number;
  detection_rate: number;
  guard_count: number;
}

// 最近预警类型
interface RecentAlert {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  level: 'high' | 'medium' | 'low' | 'danger' | 'warning' | 'safe';
  created_at: string;
}

const quickActions = [
  { label: '智能检测', icon: MagnifyingGlassIcon, path: '/detection', desc: '文本/图片/音频分析' },
  { label: '实时监控', icon: ShieldCheckIcon, path: '/monitor', desc: '通话与消息监测' },
  { label: '预警中心', icon: BellAlertIcon, path: '/alerts', desc: '查看安全提醒' },
  { label: '知识库', icon: BookOpenIcon, path: '/knowledge', desc: '反诈案例学习' },
  { label: '检测记录', icon: ClockIcon, path: '/history', desc: '历史检测记录' },
  { label: '家庭守护', icon: UserGroupIcon, path: '/family', desc: '家庭成员管理' },
];

export default function Dashboard() {
  const { mode } = useModeStore();
  if (mode === 'elder') return <ElderDashboard />;
  if (mode === 'minor') return <MinorDashboard />;
  return <StandardDashboard />;
}

function StandardDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StatisticsOverview | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 并行请求统计数据和最近预警
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/statistics/overview'),
        api.get('/alerts/?limit=5').catch(() => ({ data: [] })),
      ]);
      
      setStats(statsRes.data);
      
      // 处理预警数据
      const alerts: RecentAlert[] = (alertsRes.data || []).slice(0, 3).map((alert: { id: number; fraud_type?: string; risk_level: string; message?: string; created_at: string }) => ({
        id: alert.id,
        type: alert.fraud_type || '风险预警',
        title: `检测到${alert.risk_level === 'high' || alert.risk_level === 'critical' ? '高' : alert.risk_level === 'medium' ? '中' : '低'}风险`,
        message: alert.message || '系统已自动处理',
        time: formatRelativeTime(alert.created_at),
        level: (alert.risk_level === 'high' || alert.risk_level === 'critical' ? 'danger' : alert.risk_level === 'medium' ? 'warning' : 'safe') as RecentAlert['level'],
        created_at: alert.created_at,
      }));
      
      // 如果没有真实数据，显示占位
      if (alerts.length === 0) {
        setRecentAlerts([
          { id: 1, type: '系统正常', title: '暂无预警', message: '系统运行正常，暂无风险预警', time: '刚刚', level: 'safe', created_at: '' },
        ]);
      } else {
        setRecentAlerts(alerts);
      }
    } catch (err) {
      console.error('加载仪表盘数据失败:', err);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化相对时间
  const formatRelativeTime = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
  };

  // 构建统计卡片数据
  const statsData = [
    { 
      label: '今日检测', 
      value: stats?.today_detections || 0, 
      icon: MagnifyingGlassIcon, 
      change: '+12%', 
      up: true, 
      iconClass: 'stat-icon-primary',
      link: '/history',
    },
    { 
      label: '拦截风险', 
      value: stats?.today_fraud || 0, 
      icon: ShieldCheckIcon, 
      change: `+${stats?.today_fraud || 0}`, 
      up: false, 
      iconClass: 'stat-icon-danger',
      link: '/history?filter=fraud',
    },
    { 
      label: '总检测量', 
      value: stats?.total_detections || 0, 
      icon: PhoneIcon, 
      change: '+8%', 
      up: true, 
      iconClass: 'stat-icon-safe',
      link: '/history',
    },
    { 
      label: '待处理', 
      value: stats?.alerts_pending || 0, 
      icon: BellAlertIcon, 
      change: stats?.alerts_pending ? `${stats.alerts_pending}条` : '无', 
      up: (stats?.alerts_pending || 0) === 0, 
      iconClass: 'stat-icon-warning',
      link: '/alerts?filter=pending',
    },
  ];

  // 用户称呼
  const userName = user?.nickname || user?.username || '守护者';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 欢迎横幅 - 动态用户名 */}
      <ScrollReveal>
        <div className="card bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200 overflow-hidden relative">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1 sm:mb-2">
                您好，{userName}
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                系统运行正常，今日已为您拦截 
                <span className="text-sky-600 font-semibold mx-1">{stats?.today_fraud || 0}</span>
                条风险信息
              </p>
            </div>
            <div className="hidden sm:block flex-shrink-0">
              <div className={`risk-orb ${stats?.alerts_pending ? 'risk-orb-warning' : 'risk-orb-safe'}`}>
                <span className="risk-orb-value">{stats?.alerts_pending ? '注意' : '安全'}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 统计卡片 - 可点击跳转 */}
      <StaggerContainer className="bento-grid-4">
        {statsData.map((stat, idx) => (
          <StaggerItem key={idx}>
            <Link to={stat.link}>
              <HoverCard className="stat-card cursor-pointer hover:border-sky-300">
                <div className={`stat-icon ${stat.iconClass}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="stat-value">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="stat-label">{stat.label}</div>
                <div className={`stat-change ${stat.up ? 'up' : 'down'}`}>
                  {stat.up ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                  {stat.change}
                </div>
              </HoverCard>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* 快捷入口 */}
      <ScrollReveal delay={0.2}>
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">快捷入口</h2>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {quickActions.map((action, idx) => (
              <StaggerItem key={idx}>
                <Link to={action.path}>
                  <HoverCard className="card group cursor-pointer">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 group-hover:border-sky-300 transition-all">
                        <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm sm:text-base group-hover:text-sky-600 transition-colors">{action.label}</div>
                        <div className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 truncate">{action.desc}</div>
                      </div>
                      <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </HoverCard>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </ScrollReveal>

      {/* 双列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 最近预警 - 可点击 */}
        <ScrollReveal delay={0.3}>
          <div className="card h-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">最近预警</h2>
              <Link to="/alerts" className="text-xs sm:text-sm text-sky-600 hover:text-sky-700 transition-colors">查看全部</Link>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {recentAlerts.map((alert) => (
                <Link to={`/alerts?id=${alert.id}`} key={alert.id}>
                  <HoverCard scale={1.01}>
                    <div className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all cursor-pointer group">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        alert.level === 'danger' ? 'bg-red-100 border border-red-200' : 
                        alert.level === 'warning' ? 'bg-amber-100 border border-amber-200' :
                        'bg-green-100 border border-green-200'
                      }`}>
                        <ExclamationTriangleIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          alert.level === 'danger' ? 'text-red-600' : 
                          alert.level === 'warning' ? 'text-amber-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm sm:text-base truncate">{alert.type}</div>
                        <div className="text-xs sm:text-sm text-slate-500 truncate">{alert.message}</div>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap flex-shrink-0">{alert.time}</div>
                    </div>
                  </HoverCard>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* 系统状态 */}
        <ScrollReveal delay={0.4}>
          <div className="card h-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">系统状态</h2>
              <span className="status-badge status-safe text-xs sm:text-sm"><CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />运行中</span>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CpuChipIcon className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
                  <span className="text-slate-600 text-sm sm:text-base">AI 检测引擎</span>
                </div>
                <span className="text-green-600 font-medium text-sm">在线</span>
              </div>
              <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <ServerIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  <span className="text-slate-600 text-sm sm:text-base">知识库同步</span>
                </div>
                <span className="text-green-600 font-medium text-sm">已更新</span>
              </div>
              <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <SignalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                  <span className="text-slate-600 text-sm sm:text-base">实时监控</span>
                </div>
                <span className="text-green-600 font-medium text-sm">运行中</span>
              </div>
              <Link to="/family" className="flex items-center justify-between py-2 sm:py-3 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2 sm:gap-3">
                  <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
                  <span className="text-slate-600 text-sm sm:text-base">家庭守护</span>
                </div>
                <span className="text-sky-600 font-medium text-sm">{stats?.guard_count || 0} 人守护</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

function ElderDashboard() {
  const { user } = useAuthStore();
  const [guardians, setGuardians] = useState<{ nickname: string; username: string }[]>([]);

  useEffect(() => {
    // 加载监护人列表
    api.get('/guardians/').then(res => {
      setGuardians(res.data?.map((g: { guardian_nickname: string; guardian_username: string }) => ({
        nickname: g.guardian_nickname,
        username: g.guardian_username,
      })) || []);
    }).catch(() => {});
  }, []);

  const userName = user?.nickname || user?.username || '您';

  return (
    <div className="space-y-8">
      {/* 安全状态卡片 */}
      <ScrollReveal>
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-center py-12">
          <div className="w-24 h-24 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircleIcon className="w-14 h-14 text-green-600" />
          </div>
          <h1 className="text-elder-2xl font-bold text-slate-800">{userName}，当前安全</h1>
          <p className="text-elder-base mt-2 text-slate-600">系统正在保护您的通话和消息安全</p>
        </div>
      </ScrollReveal>

      {/* 大按钮入口 */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StaggerItem>
          <Link to="/monitor" className="block p-8 bg-white rounded-2xl border-2 border-sky-200 shadow-card hover:shadow-card-hover hover:border-sky-300 transition-all text-center group">
            <div className="w-20 h-20 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-sky-200 transition-colors">
              <PhoneIcon className="w-10 h-10 text-sky-600" />
            </div>
            <div className="text-elder-xl font-bold text-slate-800">通话监测</div>
            <div className="text-elder-base text-slate-500 mt-2">实时保护您的通话安全</div>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link to="/family" className="block p-8 bg-white rounded-2xl border-2 border-red-200 shadow-card hover:shadow-card-hover hover:border-red-300 transition-all text-center group">
            <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
              <BellAlertIcon className="w-10 h-10 text-red-600" />
            </div>
            <div className="text-elder-xl font-bold text-slate-800">一键求助</div>
            <div className="text-elder-base text-slate-500 mt-2">遇到可疑情况立即求助</div>
          </Link>
        </StaggerItem>
      </StaggerContainer>

      {/* 家人守护 - 真实数据 */}
      <ScrollReveal delay={0.2}>
        <div className="card">
          <h2 className="text-elder-xl font-bold text-slate-800 mb-6 text-center">家人守护</h2>
          {guardians.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {guardians.map((guardian, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-20 h-20 rounded-full bg-sky-100 border-2 border-sky-200 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-sky-600">
                      {guardian.nickname?.charAt(0) || guardian.username?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="text-elder-base font-medium text-slate-800">{guardian.nickname || guardian.username}</div>
                  <div className="text-green-600 text-sm">在线守护中</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserGroupIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 text-elder-base">暂无守护者</p>
              <Link to="/family" className="inline-block mt-4 text-sky-600 hover:text-sky-700">
                去添加守护者 →
              </Link>
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}

function MinorDashboard() {
  const { user } = useAuthStore();
  const [safetyScore] = useState(85);
  const userName = user?.nickname || user?.username || '同学';

  return (
    <div className="space-y-6">
      {/* 安全分数 */}
      <ScrollReveal>
        <div className="card p-8 text-center bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <h1 className="text-xl font-bold text-slate-800 mb-4">{userName}的安全分数</h1>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#E0F2FE" strokeWidth="8" />
              <circle cx="64" cy="64" r="56" fill="none" stroke="#0EA5E9" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${safetyScore * 3.52} 352`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatedCounter value={safetyScore} className="text-4xl font-bold text-sky-600" />
            </div>
          </div>
          <p className="text-slate-600">继续保持，你做得很棒！</p>
        </div>
      </ScrollReveal>

      {/* 今日任务 */}
      <ScrollReveal delay={0.1}>
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">今日安全任务</h2>
          <div className="space-y-4">
            <HoverCard scale={1.01}>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center">
                  <BookOpenIcon className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">学习：识别网络诈骗</div>
                  <div className="progress-bar mt-2">
                    <div className="progress-bar-fill" style={{ width: '60%' }} />
                  </div>
                </div>
                <span className="text-sm text-teal-600 font-medium">60%</span>
              </div>
            </HoverCard>
            <HoverCard scale={1.01}>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center">
                  <PlayIcon className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">观看：游戏充值安全</div>
                  <div className="progress-bar mt-2">
                    <div className="progress-bar-fill" style={{ width: '30%' }} />
                  </div>
                </div>
                <span className="text-sm text-teal-600 font-medium">30%</span>
              </div>
            </HoverCard>
          </div>
        </div>
      </ScrollReveal>

      {/* 快捷入口 */}
      <StaggerContainer className="bento-grid-2">
        <StaggerItem>
          <Link to="/detection">
            <HoverCard className="card group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <MagnifyingGlassIcon className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">安全检测</div>
                  <div className="text-sm text-slate-500">检查消息是否安全</div>
                </div>
              </div>
            </HoverCard>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link to="/knowledge">
            <HoverCard className="card group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <BookOpenIcon className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">安全课堂</div>
                  <div className="text-sm text-slate-500">学习网络安全知识</div>
                </div>
              </div>
            </HoverCard>
          </Link>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
