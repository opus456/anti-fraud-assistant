import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useModeStore } from '../store/modeStore';
import { useAuthStore } from '../store';
import { 
  StaggerContainer, StaggerItem, ScrollReveal, AnimatedCounter, 
} from '../components/motion';
import {
  MagnifyingGlassIcon, BellAlertIcon,
  BookOpenIcon, UserGroupIcon, PhoneIcon,
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


// 中心雷达环形仪表 - 沉浸式
function RadarRing({ score, threatCount, size = 280 }: { score: number; threatCount: number; size?: number }) {
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  // 色彩梯度：红到绿
  const getGradientId = () => score >= 70 ? 'ring-safe' : score >= 50 ? 'ring-warn' : 'ring-danger';
  return (
    <div className="radar-container" style={{ width: size, height: size }}>
      {/* 扫描线动画 */}
      <div className="radar-scan">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(44,197,189,0)" />
              <stop offset="100%" stopColor="rgba(44,197,189,0.3)" />
            </linearGradient>
          </defs>
          <path d={`M ${size/2} ${size/2} L ${size/2} 10 A ${size/2-10} ${size/2-10} 0 0 1 ${size-20} ${size/2} Z`} fill="url(#sweep-grad)" />
        </svg>
      </div>
      <svg width={size} height={size} className="transform -rotate-90 absolute inset-0">
        <defs>
          <linearGradient id="ring-safe" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#2CC5BD" /></linearGradient>
          <linearGradient id="ring-warn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#FBBF24" /></linearGradient>
          <linearGradient id="ring-danger" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#F43F5E" /><stop offset="100%" stopColor="#FB7185" /></linearGradient>
        </defs>
        {/* 背景环 */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" className="radar-ring-bg" strokeWidth="4" />
        {/* 外装饰环 */}
        <circle cx={size/2} cy={size/2} r={r+6} fill="none" stroke="rgba(44,197,189,0.04)" strokeWidth="1" />
        <circle cx={size/2} cy={size/2} r={r-8} fill="none" stroke="rgba(44,197,189,0.06)" strokeWidth="1" strokeDasharray="4 8" />
        {/* 分数环 */}
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${getGradientId()})`} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference} className="radar-ring-value"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>
      {/* 中心内容 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <motion.div className="text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.5 }}>
          <div className="text-6xl font-black text-slate-800 tracking-tighter font-mono leading-none">
            <AnimatedCounter value={threatCount} />
          </div>
          <div className="text-[10px] font-bold text-accent-600 uppercase tracking-[0.2em] mt-2">threats blocked</div>
          <div className="h-px w-16 bg-accent-600/20 mx-auto my-3" />
          <div className="text-sm text-slate-500">安全评分 <span className={`font-bold ${score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{score}</span></div>
        </motion.div>
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
  // 安全分数：基础 80 分，仅根据真实未处理预警微调（每个 -2），不受演示基数影响
  const realPending = Math.max(0, (stats?.alerts_pending || 0) - 15); // 减去后端演示基数
  const safetyScore = Math.min(100, Math.max(60, 80 - realPending * 2));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-accent-400/20 border-t-accent-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-sm font-mono">LOADING SYSTEMS...</p>
        </div>
      </div>
    );
  }

  const riskPercent = ((stats?.today_fraud || 0) / (stats?.today_detections || 1) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* ====== 中心雷达仪表台 + 非对称数据 ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
        
        {/* 左侧：浮动数据面板 */}
        <div className="space-y-4 lg:pt-8">
          <ScrollReveal>
            <motion.div className="data-widget" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <div className="data-label">今日检测</div>
              <div className="data-value"><AnimatedCounter value={stats?.today_detections || 0} /></div>
              <div className="data-change text-emerald-600 flex items-center gap-1"><ArrowTrendingUpIcon className="w-3.5 h-3.5" /> +12.5% vs 昨日</div>
            </motion.div>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <motion.div className="data-widget" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <div className="data-label">风险占比</div>
              <div className="data-value">{riskPercent}<span className="text-lg text-slate-500">%</span></div>
              <div className="data-change text-emerald-600 flex items-center gap-1"><ArrowTrendingDownIcon className="w-3.5 h-3.5" /> -2.1% 风险下降</div>
            </motion.div>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <motion.div className="data-widget" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="data-label">守护网络</div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-accent-600 font-mono">{stats?.guard_count || 0}</span>
                <span className="text-xs text-slate-500">人 · 已守护</span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-bold text-slate-700 font-mono"><AnimatedCounter value={stats?.total_detections || 0} /></span>
                <span className="text-xs text-slate-500">次 · 累计检测</span>
              </div>
            </motion.div>
          </ScrollReveal>
        </div>

        {/* 中心：雷达环形仪表盘 */}
        <div className="flex flex-col items-center justify-center lg:py-4">
          <ScrollReveal>
            <div className="relative">
              {/* 外围光晕 */}
              <div className="absolute inset-0 bg-glow-cyan scale-150 opacity-30 pointer-events-none" />
              <RadarRing score={safetyScore} threatCount={todayFraud} size={260} />
            </div>
            <motion.div className="text-center mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <p className="text-slate-500 text-xs">您好，<span className="text-slate-700 font-medium">{userName}</span></p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">AI MULTI-MODAL GUARDIAN ACTIVE</p>
            </motion.div>
          </ScrollReveal>
        </div>

        {/* 右侧：实时日志流 + 待处理 */}
        <div className="space-y-4 lg:pt-8">
          <ScrollReveal delay={0.15}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <Link to="/alerts?filter=pending">
                <div className="data-widget group cursor-pointer hover:border-accent-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="data-label">待处理预警</div>
                    {(stats?.alerts_pending || 0) > 0 && <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                  </div>
                  <div className="data-value text-amber-600"><AnimatedCounter value={stats?.alerts_pending || 0} /></div>
                  <div className="data-change text-slate-400 group-hover:text-accent-600 transition-colors">
                    {(stats?.alerts_pending || 0) > 0 ? '需立即跟进 →' : '全部已处理 ✓'}
                  </div>
                </div>
              </Link>
            </motion.div>
          </ScrollReveal>

          {/* 实时日志流 */}
          <ScrollReveal delay={0.25}>
            <motion.div className="data-widget" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="data-label">实时风险捕获</div>
                <Link to="/alerts" className="text-[10px] text-accent-600 hover:text-accent-700 font-mono transition-colors">LIVE →</Link>
              </div>
              <div className="log-stream" style={{ maxHeight: '160px' }}>
                {recentAlerts.map((alert, idx) => (
                  <motion.div key={alert.id} className={`log-entry ${alert.level}`}
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + idx * 0.15 }}>
                    <span className="log-time">{alert.time}</span>
                    <span className={`log-type ${
                      alert.level === 'danger' ? 'text-rose-600' : alert.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{alert.level === 'danger' ? 'HIGH' : alert.level === 'warning' ? 'MED' : 'LOW'}</span>
                    <span className="log-msg">{alert.type} · {alert.message}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </ScrollReveal>
        </div>
      </div>

      {/* ====== 系统状态条 ====== */}
      <ScrollReveal delay={0.3}>
        <div className="glass-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {[
              { icon: CpuChipIcon, label: 'AI 检测引擎', status: '在线', ok: true },
              { icon: ServerIcon, label: '知识库同步', status: '已更新', ok: true },
              { icon: SignalIcon, label: '实时监控', status: '运行中', ok: true },
              { icon: UserGroupIcon, label: '家庭守护', status: `${stats?.guard_count || 0} 人`, ok: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className={`text-xs font-mono font-medium ${item.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
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
        <div className="glass-card text-center py-12 px-6">
          <div className="w-24 h-24 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-14 h-14 text-emerald-600" />
          </div>
          <h1 className="text-elder-2xl font-bold text-slate-800">{userName}，当前安全</h1>
          <p className="text-elder-base mt-2 text-slate-500">系统正在保护您的通话和消息安全</p>
        </div>
      </ScrollReveal>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StaggerItem>
          <Link to="/monitor" className="block p-8 glass-card text-center group">
            <div className="w-20 h-20 rounded-2xl bg-accent-50 border border-accent-200 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-100 transition-colors"><PhoneIcon className="w-10 h-10 text-accent-600" /></div>
            <div className="text-elder-xl font-bold text-slate-800">通话监测</div>
            <div className="text-elder-base text-slate-500 mt-2">实时保护您的通话安全</div>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link to="/family" className="block p-8 glass-card text-center group">
            <div className="w-20 h-20 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 group-hover:bg-rose-100 transition-colors"><BellAlertIcon className="w-10 h-10 text-rose-600" /></div>
            <div className="text-elder-xl font-bold text-slate-800">一键求助</div>
            <div className="text-elder-base text-slate-500 mt-2">遇到可疑情况立即求助</div>
          </Link>
        </StaggerItem>
      </StaggerContainer>
      <ScrollReveal delay={0.2}>
        <div className="glass-card p-6">
          <h2 className="text-elder-xl font-bold text-slate-800 mb-6 text-center">家人守护</h2>
          {guardians.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {guardians.map((g, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-accent-50 border border-accent-200 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-accent-600">{g.nickname?.charAt(0) || g.username?.charAt(0) || '?'}</span>
                  </div>
                  <div className="text-elder-base font-medium text-slate-800">{g.nickname || g.username}</div>
                  <div className="text-emerald-600 text-sm flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 在线守护中
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8"><UserGroupIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" /><p className="text-slate-500 text-elder-base">暂无守护者</p><Link to="/family" className="inline-block mt-4 text-accent-600 hover:text-accent-700">去添加守护者 →</Link></div>
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
        <div className="p-8 text-center glass-card">
          <h1 className="text-xl font-bold text-slate-800 mb-4">{userName}的安全分数</h1>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#E2E8F0" strokeWidth="8" />
              <circle cx="64" cy="64" r="56" fill="none" stroke="#0D9488" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${safetyScore * 3.52} 352`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center"><AnimatedCounter value={safetyScore} className="text-4xl font-bold text-accent-600" /></div>
          </div>
          <p className="text-slate-500">继续保持，你做得很棒！</p>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.1}>
        <div className="p-5 glass-card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">今日安全任务</h2>
          <div className="space-y-3">
            {[{ icon: BookOpenIcon, title: '学习：识别网络诈骗', progress: 60 }, { icon: PlayIcon, title: '观看：游戏充值安全', progress: 30 }].map((task, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-accent-50 flex items-center justify-center"><task.icon className="w-6 h-6 text-accent-600" /></div>
                <div className="flex-1">
                  <div className="font-medium text-slate-700 text-sm">{task.title}</div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2"><div className="h-full bg-accent-500 rounded-full" style={{ width: `${task.progress}%` }} /></div>
                </div>
                <span className="text-sm text-accent-600 font-medium font-mono">{task.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
      <StaggerContainer className="grid grid-cols-2 gap-3">
        {[{ to: '/detection', icon: MagnifyingGlassIcon, label: '安全检测', desc: '检查消息安全' }, { to: '/knowledge', icon: BookOpenIcon, label: '安全课堂', desc: '学习网络安全' }].map((item, i) => (
          <StaggerItem key={i}>
            <Link to={item.to}>
              <div className="flex items-center gap-3 p-4 glass-card cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center group-hover:bg-accent-100 transition-colors"><item.icon className="w-5 h-5 text-accent-600" /></div>
                <div><div className="font-semibold text-slate-800 text-sm">{item.label}</div><div className="text-xs text-slate-500">{item.desc}</div></div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}
