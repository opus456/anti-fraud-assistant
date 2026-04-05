import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useModeStore } from '../store/modeStore';
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

const statsData = [
  { label: '今日检测', value: '1,234', icon: MagnifyingGlassIcon, change: '+12%', up: true, iconClass: 'stat-icon-cyan' },
  { label: '拦截风险', value: '23', icon: ShieldCheckIcon, change: '+5', up: false, iconClass: 'stat-icon-danger' },
  { label: '安全通话', value: '456', icon: PhoneIcon, change: '+8%', up: true, iconClass: 'stat-icon-safe' },
  { label: '待处理', value: '3', icon: BellAlertIcon, change: '-2', up: true, iconClass: 'stat-icon-warning' },
];

const quickActions = [
  { label: '智能检测', icon: MagnifyingGlassIcon, path: '/detection', desc: '文本/图片/音频分析' },
  { label: '实时监控', icon: ShieldCheckIcon, path: '/monitor', desc: '通话与消息监测' },
  { label: '预警中心', icon: BellAlertIcon, path: '/alerts', desc: '查看安全提醒' },
  { label: '知识库', icon: BookOpenIcon, path: '/knowledge', desc: '反诈案例学习' },
  { label: '检测记录', icon: ClockIcon, path: '/history', desc: '历史检测记录' },
  { label: '家庭守护', icon: UserGroupIcon, path: '/family', desc: '家庭成员管理' },
];

const recentAlerts = [
  { id: 1, type: '投资诈骗', message: '检测到疑似投资理财诈骗信息', time: '10分钟前', level: 'danger' },
  { id: 2, type: '刷单诈骗', message: '可疑兼职刷单信息已拦截', time: '1小时前', level: 'warning' },
  { id: 3, type: '冒充公检法', message: '疑似冒充公检法通话已标记', time: '2小时前', level: 'danger' },
];

export default function Dashboard() {
  const { mode } = useModeStore();
  if (mode === 'elder') return <ElderDashboard />;
  if (mode === 'minor') return <MinorDashboard />;
  return <StandardDashboard />;
}

function StandardDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 欢迎横幅 - 科技风渐变 */}
      <div className="card bg-gradient-to-r from-dark-50 to-dark-100 border-cyan-400/20 overflow-hidden relative">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-neon-500/10 rounded-full blur-3xl translate-y-1/2" />
        
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-text-primary text-glow mb-2">您好，守护者</h1>
            <p className="text-text-secondary">系统运行正常，今日已为您拦截 <span className="text-cyan-400 font-semibold">23</span> 条风险信息</p>
          </div>
          <div className="hidden md:block">
            <div className="risk-orb risk-orb-safe">
              <span className="risk-orb-value">安全</span>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 - Bento Grid */}
      <div className="bento-grid-4">
        {statsData.map((stat, idx) => (
          <div key={idx} className="stat-card">
            <div className={`stat-icon ${stat.iconClass}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.up ? 'up' : 'down'}`}>
              {stat.up ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* 快捷入口 */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">快捷入口</h2>
        <div className="bento-grid-3">
          {quickActions.map((action, idx) => (
            <Link key={idx} to={action.path} className="card group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center group-hover:bg-cyan-400/20 group-hover:border-cyan-400/40 group-hover:shadow-glow-cyan transition-all">
                  <action.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-text-primary group-hover:text-cyan-400 transition-colors">{action.label}</div>
                  <div className="text-sm text-text-muted mt-1">{action.desc}</div>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-text-muted group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 双列布局 */}
      <div className="bento-grid-2">
        {/* 最近预警 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">最近预警</h2>
            <Link to="/alerts" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">查看全部</Link>
          </div>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-transparent hover:border-card-border-hover transition-all cursor-pointer group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.level === 'danger' ? 'bg-danger-500/15 border border-danger-500/30' : 'bg-warning-500/15 border border-warning-500/30'}`}>
                  <ExclamationTriangleIcon className={`w-5 h-5 ${alert.level === 'danger' ? 'text-danger-400' : 'text-warning-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary truncate">{alert.type}</div>
                  <div className="text-sm text-text-muted truncate">{alert.message}</div>
                </div>
                <div className="text-xs text-text-muted whitespace-nowrap">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 系统状态 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">系统状态</h2>
            <span className="status-badge status-safe"><CheckCircleIcon className="w-4 h-4" />运行中</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-card-border">
              <div className="flex items-center gap-3">
                <CpuChipIcon className="w-5 h-5 text-cyan-400" />
                <span className="text-text-secondary">AI 检测引擎</span>
              </div>
              <span className="text-safe-400 font-medium">在线</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-card-border">
              <div className="flex items-center gap-3">
                <ServerIcon className="w-5 h-5 text-neon-400" />
                <span className="text-text-secondary">知识库同步</span>
              </div>
              <span className="text-safe-400 font-medium">已更新</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-card-border">
              <div className="flex items-center gap-3">
                <SignalIcon className="w-5 h-5 text-purple-400" />
                <span className="text-text-secondary">实时监控</span>
              </div>
              <span className="text-safe-400 font-medium">运行中</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <UserGroupIcon className="w-5 h-5 text-cyan-400" />
                <span className="text-text-secondary">家庭成员连接</span>
              </div>
              <span className="text-cyan-400 font-medium">3 人在线</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ElderDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* 安全状态卡片 */}
      <div className="card bg-gradient-to-br from-safe-500/20 to-safe-600/10 border-safe-500/30 text-center py-12">
        <div className="w-24 h-24 rounded-full bg-safe-500/20 border-2 border-safe-400/50 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <CheckCircleIcon className="w-14 h-14 text-safe-400" />
        </div>
        <h1 className="text-elder-2xl font-bold text-text-primary text-glow">当前安全</h1>
        <p className="text-elder-base mt-2 text-text-secondary">系统正在保护您的通话和消息安全</p>
      </div>

      {/* 大按钮入口 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/monitor" className="elder-tile elder-tile-primary">
          <div className="elder-tile-icon"><PhoneIcon className="w-12 h-12" /></div>
          <div className="elder-tile-title">通话监测</div>
          <div className="elder-tile-desc">实时保护您的通话安全</div>
        </Link>
        <Link to="/alerts" className="elder-tile elder-tile-danger">
          <div className="elder-tile-icon"><BellAlertIcon className="w-12 h-12" /></div>
          <div className="elder-tile-title">一键求助</div>
          <div className="elder-tile-desc">遇到可疑情况立即求助</div>
        </Link>
      </div>

      {/* 家人守护 */}
      <div className="card">
        <h2 className="text-elder-xl font-bold text-text-primary mb-6 text-center">家人守护</h2>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-cyan-400/15 border-2 border-cyan-400/30 flex items-center justify-center mx-auto mb-3">
              <UserGroupIcon className="w-10 h-10 text-cyan-400" />
            </div>
            <div className="text-elder-base font-medium text-text-primary">小明</div>
            <div className="text-safe-400 text-sm">在线守护中</div>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-cyan-400/15 border-2 border-cyan-400/30 flex items-center justify-center mx-auto mb-3">
              <UserGroupIcon className="w-10 h-10 text-cyan-400" />
            </div>
            <div className="text-elder-base font-medium text-text-primary">小红</div>
            <div className="text-safe-400 text-sm">在线守护中</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MinorDashboard() {
  const [safetyScore] = useState(85);
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 安全分数 */}
      <div className="minor-card p-8 text-center">
        <h1 className="text-xl font-bold text-text-primary mb-4">我的安全分数</h1>
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="8" />
            <circle cx="64" cy="64" r="56" fill="none" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${safetyScore * 3.52} 352`} style={{ filter: 'drop-shadow(0 0 6px rgba(20, 184, 166, 0.5))' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-[#2DD4BF] font-tech">{safetyScore}</span>
          </div>
        </div>
        <p className="text-text-muted">继续保持，你做得很棒！</p>
      </div>

      {/* 今日任务 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">今日安全任务</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-card-border">
            <div className="w-12 h-12 rounded-full bg-[#14B8A6]/15 border border-[#14B8A6]/30 flex items-center justify-center">
              <BookOpenIcon className="w-6 h-6 text-[#2DD4BF]" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-text-primary">学习：识别网络诈骗</div>
              <div className="minor-progress mt-2"><div className="minor-progress-bar" style={{ width: '60%' }} /></div>
            </div>
            <span className="text-sm text-[#2DD4BF] font-medium">60%</span>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-card-border">
            <div className="w-12 h-12 rounded-full bg-[#14B8A6]/15 border border-[#14B8A6]/30 flex items-center justify-center">
              <PlayIcon className="w-6 h-6 text-[#2DD4BF]" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-text-primary">观看：游戏充值安全</div>
              <div className="minor-progress mt-2"><div className="minor-progress-bar" style={{ width: '30%' }} /></div>
            </div>
            <span className="text-sm text-[#2DD4BF] font-medium">30%</span>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="bento-grid-2">
        <Link to="/detection" className="card group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 flex items-center justify-center group-hover:bg-[#14B8A6]/25 transition-colors">
              <MagnifyingGlassIcon className="w-6 h-6 text-[#2DD4BF]" />
            </div>
            <div>
              <div className="font-semibold text-text-primary">安全检测</div>
              <div className="text-sm text-text-muted">检查消息是否安全</div>
            </div>
          </div>
        </Link>
        <Link to="/knowledge" className="card group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/30 flex items-center justify-center group-hover:bg-[#14B8A6]/25 transition-colors">
              <BookOpenIcon className="w-6 h-6 text-[#2DD4BF]" />
            </div>
            <div>
              <div className="font-semibold text-text-primary">安全课堂</div>
              <div className="text-sm text-text-muted">学习网络安全知识</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
