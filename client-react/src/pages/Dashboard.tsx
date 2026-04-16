import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useModeStore } from '../store/modeStore';
import { useAuthStore } from '../store';
import { 
  StaggerContainer, StaggerItem, ScrollReveal, AnimatedCounter, 
} from '../components/motion';
import {
  ShieldCheckIcon, MagnifyingGlassIcon, BellAlertIcon, ClockIcon,
  BookOpenIcon, UserGroupIcon, PhoneIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  PlayIcon, CpuChipIcon, ServerIcon, SignalIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface StatisticsOverview {
  total_users: number; total_detections: number; fraud_detected: number;
  alerts_pending: number; alerts_resolved: number; today_detections: number;
  today_fraud: number; detection_rate: number; guard_count: number;
}
interface RecentAlert {
  id: number; type: string; title: string; message: string; time: string;
  level: 'high' | 'medium' | 'low' | 'danger' | 'warning' | 'safe'; created_at: string;
}

const quickActions = [
  { label: '智能检测', icon: MagnifyingGlassIcon, path: '/detection', desc: '文本/图片/音频', color: 'from-blue-500 to-sky-400', bg: 'bg-blue-50' },
  { label: '实时监控', icon: ShieldCheckIcon, path: '/monitor', desc: '通话与消息监测', color: 'from-emerald-500 to-green-400', bg: 'bg-emerald-50' },
  { label: '预警中心', icon: BellAlertIcon, path: '/alerts', desc: '安全提醒', color: 'from-amber-500 to-orange-400', bg: 'bg-amber-50' },
  { label: '知识库', icon: BookOpenIcon, path: '/knowledge', desc: '反诈案例', color: 'from-violet-500 to-purple-400', bg: 'bg-violet-50' },
  { label: '检测记录', icon: ClockIcon, path: '/history', desc: '历史记录', color: 'from-cyan-500 to-teal-400', bg: 'bg-cyan-50' },
  { label: '家庭守护', icon: UserGroupIcon, path: '/family', desc: '成员管理', color: 'from-pink-500 to-rose-400', bg: 'bg-pink-50' },
];

// 安全评分环形图
function SafetyRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#F43F5E';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-white/50 uppercase tracking-wider">安全分</span>
      </div>
    </div>
  );
}

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

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        api.get('/statistics/overview'),
        api.get('/alerts/?limit=5').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      const alerts: RecentAlert[] = (alertsRes.data || []).slice(0, 3).map((alert: { id: number; fraud_type?: string; risk_level: string; message?: string; created_at: string }) => ({
        id: alert.id, type: alert.fraud_type || '风险预警',
        title: `检测到${alert.risk_level === 'high' || alert.risk_level === 'critical' ? '高' : alert.risk_level === 'medium' ? '中' : '低'}风险`,
        message: alert.message || '系统已自动处理', time: formatRelativeTime(alert.created_at),
        level: (alert.risk_level === 'high' || alert.risk_level === 'critical' ? 'danger' : alert.risk_level === 'medium' ? 'warning' : 'safe') as RecentAlert['level'],
        created_at: alert.created_at,
      }));
      if (alerts.length === 0) {
        setRecentAlerts([{ id: 1, type: '系统正常', title: '暂无预警', message: '暂无风险预警', time: '刚刚', level: 'safe', created_at: '' }]);
      } else { setRecentAlerts(alerts); }
    } catch (err) { console.error('加载仪表盘数据失败:', err); toast.error('加载数据失败'); }
    finally { setLoading(false); }
  };

  const formatRelativeTime = (dateStr: string): string => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${Math.floor(diffHours / 24)}天前`;
  };

  const userName = user?.nickname || user?.username || '守护者';
  const todayFraud = stats?.today_fraud || 0;
  const safetyScore = Math.min(100, Math.max(0, 100 - (todayFraud * 2) - (stats?.alerts_pending || 0) * 5));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ====== Hero Section: 核心态势感知 ====== */}
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1e3d] via-[#0d2847] to-[#0a2540] p-6 sm:p-8">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          {/* 半透明盾牌水印 */}
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 sm:w-56 sm:h-56 text-white/[0.03]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex-1">
              <p className="text-white/40 text-sm mb-2 font-medium">AI Guardian · 态势感知</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-snug">
                您好，{userName}！今天 AI 已拦截{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300 text-4xl sm:text-5xl font-black">
                  <AnimatedCounter value={todayFraud} />
                </span>
                {' '}次风险
              </h1>
              <p className="text-white/40 text-sm">
                累计检测 {stats?.total_detections || 0} 次 · 守护 {stats?.guard_count || 0} 人 · 待处理 {stats?.alerts_pending || 0} 条预警
              </p>
            </div>
            <SafetyRing score={safetyScore} />
          </div>
        </div>
      </ScrollReveal>

      {/* ====== 数据看板：3 个极简卡片 ====== */}
      <StaggerContainer className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: '今日检测', value: stats?.today_detections || 0, icon: MagnifyingGlassIcon, change: '+12%', up: true, iconColor: 'text-sky-500', iconBg: 'bg-sky-50' },
          { label: '总检测量', value: stats?.total_detections || 0, icon: PhoneIcon, change: '+8%', up: true, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50' },
          { label: '待处理', value: stats?.alerts_pending || 0, icon: BellAlertIcon, change: stats?.alerts_pending ? `${stats.alerts_pending}条` : '无', up: (stats?.alerts_pending || 0) === 0, iconColor: 'text-amber-500', iconBg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <StaggerItem key={idx}>
            <Link to={idx === 2 ? '/alerts?filter=pending' : '/history'}>
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 hover:border-sky-200 transition-all hover:shadow-md cursor-pointer group">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                    <stat.icon className={`w-4.5 h-4.5 ${stat.iconColor}`} />
                  </div>
                  <span className="text-sm text-slate-500">{stat.label}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className={`text-xs mt-1 flex items-center gap-1 ${stat.up ? 'text-emerald-500' : 'text-red-500'}`}>
                  {stat.up ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ====== 快捷入口：轻量级图标网格 ====== */}
      <ScrollReveal delay={0.15}>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">快捷入口</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action, idx) => (
            <Link to={action.path} key={idx}>
              <motion.div
                className="flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl hover:bg-white/70 hover:shadow-sm hover:backdrop-blur transition-all group cursor-pointer"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2.5 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <action.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{action.label}</span>
                <span className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">{action.desc}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </ScrollReveal>

      {/* ====== 双列：预警 + 系统状态 ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ScrollReveal delay={0.25}>
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">最近预警</h2>
              <Link to="/alerts" className="text-xs text-sky-500 hover:text-sky-600 transition-colors font-medium">查看全部 →</Link>
            </div>
            <div className="space-y-2.5">
              {recentAlerts.map(alert => (
                <Link to={`/alerts?id=${alert.id}`} key={alert.id}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      alert.level === 'danger' ? 'bg-red-100' : alert.level === 'warning' ? 'bg-amber-100' : 'bg-green-100'
                    }`}>
                      {alert.level === 'safe' ? <CheckCircleIcon className="w-4 h-4 text-green-600" /> : <ExclamationTriangleIcon className={`w-4 h-4 ${alert.level === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{alert.type}</p>
                      <p className="text-xs text-slate-400 truncate">{alert.message}</p>
                    </div>
                    <span className="text-[10px] text-slate-300 flex-shrink-0">{alert.time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">系统状态</h2>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />运行中
              </span>
            </div>
            <div className="space-y-1">
              {[
                { icon: CpuChipIcon, color: 'text-sky-500', label: 'AI 检测引擎', status: '在线' },
                { icon: ServerIcon, color: 'text-blue-500', label: '知识库同步', status: '已更新' },
                { icon: SignalIcon, color: 'text-purple-500', label: '实时监控', status: '运行中' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-xs text-emerald-500 font-medium">{item.status}</span>
                </div>
              ))}
              <Link to="/family" className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <UserGroupIcon className="w-4 h-4 text-sky-500" />
                  <span className="text-sm text-slate-600">家庭守护</span>
                </div>
                <span className="text-xs text-sky-500 font-medium">{stats?.guard_count || 0} 人守护</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

/* ====== Elder Dashboard ====== */
function ElderDashboard() {
  const { user } = useAuthStore();
  const [guardians, setGuardians] = useState<{ nickname: string; username: string }[]>([]);
  useEffect(() => {
    api.get('/guardians/').then(res => {
      setGuardians(res.data?.map((g: { guardian_nickname: string; guardian_username: string }) => ({ nickname: g.guardian_nickname, username: g.guardian_username })) || []);
    }).catch(() => {});
  }, []);
  const userName = user?.nickname || user?.username || '您';
  return (
    <div className="space-y-8">
      <ScrollReveal>
        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-center py-12 px-6">
          <div className="w-24 h-24 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircleIcon className="w-14 h-14 text-green-600" />
          </div>
          <h1 className="text-elder-2xl font-bold text-slate-800">{userName}，当前安全</h1>
          <p className="text-elder-base mt-2 text-slate-600">系统正在保护您的通话和消息安全</p>
        </div>
      </ScrollReveal>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StaggerItem>
          <Link to="/monitor" className="block p-8 bg-white rounded-2xl border-2 border-sky-200 shadow-card hover:shadow-card-hover hover:border-sky-300 transition-all text-center group">
            <div className="w-20 h-20 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-sky-200 transition-colors"><PhoneIcon className="w-10 h-10 text-sky-600" /></div>
            <div className="text-elder-xl font-bold text-slate-800">通话监测</div>
            <div className="text-elder-base text-slate-500 mt-2">实时保护您的通话安全</div>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link to="/family" className="block p-8 bg-white rounded-2xl border-2 border-red-200 shadow-card hover:shadow-card-hover hover:border-red-300 transition-all text-center group">
            <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors"><BellAlertIcon className="w-10 h-10 text-red-600" /></div>
            <div className="text-elder-xl font-bold text-slate-800">一键求助</div>
            <div className="text-elder-base text-slate-500 mt-2">遇到可疑情况立即求助</div>
          </Link>
        </StaggerItem>
      </StaggerContainer>
      <ScrollReveal delay={0.2}>
        <div className="card">
          <h2 className="text-elder-xl font-bold text-slate-800 mb-6 text-center">家人守护</h2>
          {guardians.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {guardians.map((g, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-20 h-20 rounded-full bg-sky-100 border-2 border-sky-200 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-sky-600">{g.nickname?.charAt(0) || g.username?.charAt(0) || '?'}</span>
                  </div>
                  <div className="text-elder-base font-medium text-slate-800">{g.nickname || g.username}</div>
                  <div className="text-green-600 text-sm flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> 在线守护中
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8"><UserGroupIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" /><p className="text-slate-500 text-elder-base">暂无守护者</p><Link to="/family" className="inline-block mt-4 text-sky-600 hover:text-sky-700">去添加守护者 →</Link></div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}

/* ====== Minor Dashboard ====== */
function MinorDashboard() {
  const { user } = useAuthStore();
  const [safetyScore] = useState(85);
  const userName = user?.nickname || user?.username || '同学';
  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="p-8 text-center rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200">
          <h1 className="text-xl font-bold text-slate-800 mb-4">{userName}的安全分数</h1>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#E0F2FE" strokeWidth="8" />
              <circle cx="64" cy="64" r="56" fill="none" stroke="#007AFF" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${safetyScore * 3.52} 352`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center"><AnimatedCounter value={safetyScore} className="text-4xl font-bold text-sky-600" /></div>
          </div>
          <p className="text-slate-600">继续保持，你做得很棒！</p>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.1}>
        <div className="p-5 rounded-2xl bg-white border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">今日安全任务</h2>
          <div className="space-y-3">
            {[{ icon: BookOpenIcon, title: '学习：识别网络诈骗', progress: 60 }, { icon: PlayIcon, title: '观看：游戏充值安全', progress: 30 }].map((task, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center"><task.icon className="w-6 h-6 text-teal-600" /></div>
                <div className="flex-1"><div className="font-medium text-slate-800 text-sm">{task.title}</div><div className="progress-bar mt-2"><div className="progress-bar-fill" style={{ width: `${task.progress}%` }} /></div></div>
                <span className="text-sm text-teal-600 font-medium">{task.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
      <StaggerContainer className="grid grid-cols-2 gap-3">
        {[{ to: '/detection', icon: MagnifyingGlassIcon, label: '安全检测', desc: '检查消息安全' }, { to: '/knowledge', icon: BookOpenIcon, label: '安全课堂', desc: '学习网络安全' }].map((item, i) => (
          <StaggerItem key={i}>
            <Link to={item.to}>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-sky-200 hover:shadow-sm transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors"><item.icon className="w-5 h-5 text-teal-600" /></div>
                <div><div className="font-semibold text-slate-800 text-sm">{item.label}</div><div className="text-xs text-slate-500">{item.desc}</div></div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
