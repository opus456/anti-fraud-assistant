import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useModeStore, UserMode } from '../store/modeStore';
import { useAuthStore } from '../store';
import { PageTransition } from './motion';
import GuardianAlertModal from './GuardianAlertModal';
import api from '../api';
import toast from 'react-hot-toast';
import {
  HomeIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  BellAlertIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  AcademicCapIcon,
  MagnifyingGlassCircleIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import logo from '../assets/logo_new.png';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  modes?: UserMode[];
}

// 主导航菜单 - 精简版，重点功能
const navItems: NavItem[] = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/detection', label: '智能检测', icon: MagnifyingGlassIcon },
  { path: '/alerts', label: '预警中心', icon: BellAlertIcon },
  { path: '/family', label: '家庭守护', icon: UserGroupIcon },
  { path: '/knowledge', label: '知识库', icon: BookOpenIcon },
  { path: '/visualization', label: '数据大屏', icon: ChartBarIcon },
];

const elderNavItems: NavItem[] = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/alerts', label: '安全提醒', icon: BellAlertIcon },
  { path: '/knowledge', label: '安全课堂', icon: AcademicCapIcon },
];

const minorNavItems: NavItem[] = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/detection', label: '安全检测', icon: ShieldExclamationIcon },
  { path: '/knowledge', label: '安全课堂', icon: AcademicCapIcon },
];

const modeLabels: Record<UserMode, string> = {
  standard: '标准模式',
  elder: '长辈模式',
  minor: '青少年模式',
};

const modeIcons: Record<UserMode, React.ElementType> = {
  standard: ShieldCheckIcon,
  elder: UserGroupIcon,
  minor: AcademicCapIcon,
};

// 搜索项目配置
const searchableItems = [
  { label: '首页', path: '/', keywords: ['首页', '仪表盘', 'dashboard', '首页'] },
  { label: '智能检测', path: '/detection', keywords: ['检测', '分析', 'AI', '诈骗识别', '风险分析'] },
  { label: '知识库', path: '/knowledge', keywords: ['知识', '学习', '案例', '教程', '骗术分析'] },
  { label: '预警中心', path: '/alerts', keywords: ['预警', '警报', '通知', '风险', '提醒'] },
  { label: '个人资料', path: '/profile', keywords: ['资料', '账户', '个人', '设置'] },
  { label: '系统设置', path: '/settings', keywords: ['设置', '配置', '偏好', '系统'] },
  { label: '实时监控', path: '/monitor', keywords: ['监控', '通话', '短信', '监测', '实时'] },
  { label: '检测记录', path: '/history', keywords: ['历史', '记录', '日志', '检测记录'] },
  { label: '数据大屏', path: '/visualization', keywords: ['数据', '大屏', '可视化', '图表', '统计'] },
  { label: '家庭守护', path: '/family', keywords: ['家庭', '监护', '守护', '成员'] },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, setMode, isTransitioning } = useModeStore();
  const { user, logout } = useAuthStore();
  const currentUserModeKey = user?.id ?? user?.username ?? null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [showGuardianAlert, setShowGuardianAlert] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [hasCheckedAlerts, setHasCheckedAlerts] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 一键求助
  const handleSOS = async () => {
    if (!confirm('确定要向所有监护人发送紧急求助吗？')) return;
    setSosLoading(true);
    try {
      const res = await api.post('/guardians/emergency');
      toast.success(res.data?.message || '已向所有监护人发送紧急求助');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || '求助发送失败，请检查是否已绑定监护人';
      toast.error(msg);
    } finally {
      setSosLoading(false);
    }
  };

  // 获取待处理预警数量
  const fetchPendingAlerts = useCallback(async () => {
    try {
      const res = await api.get('/guardians/pending-alerts');
      const count = res.data?.pending_count || 0;
      setPendingAlerts(count);
      
      // 首次登录检查：如果有待处理预警，显示弹窗
      if (!hasCheckedAlerts && count > 0) {
        setShowGuardianAlert(true);
        setHasCheckedAlerts(true);
      }
    } catch {
      // 静默失败
    }
  }, [hasCheckedAlerts]);

  // 获取预警数量
  useEffect(() => {
    fetchPendingAlerts();
    // 每30秒刷新一次预警数量
    const interval = setInterval(fetchPendingAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingAlerts]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setHasCheckedAlerts(false); // 重置登录检查状态
    navigate('/login');
  };

  // 处理通知按钮点击 - 跳转到预警中心
  const handleNotificationClick = () => {
    navigate('/alerts');
  };

  const handleModeSelect = (nextMode: UserMode) => {
    setMode(nextMode, { manual: true, userKey: currentUserModeKey });
    setModeMenuOpen(false);
    navigate('/');
    toast.success(`已切换到${modeLabels[nextMode]}`);
  };

  // 搜索过滤
  const filteredSearchItems = searchQuery.trim()
    ? searchableItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // 处理搜索选择
  const handleSearchSelect = (path: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  // 打开搜索时聚焦输入框
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // 全局 ESC 快捷键：关闭所有浮层
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setModeMenuOpen(false);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const getNavItems = () => {
    switch (mode) {
      case 'elder': return elderNavItems;
      case 'minor': return minorNavItems;
      default: return navItems;
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getModeClass = () => {
    switch (mode) {
      case 'elder': return 'elder-mode';
      case 'minor': return 'minor-mode';
      default: return '';
    }
  };

  // 实时系统时间
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' });

  return (
    <div className={`min-h-screen ${getModeClass()}`}>
      {/* ====== 左侧垂直导航栏 ====== */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${modeMenuOpen || userMenuOpen ? 'expanded' : ''}`}>
        <Link to="/" className="sidebar-logo">
          <div className="logo-mark">
            <img src={logo} alt="聆析护盾" className="logo-mark-img" />
          </div>
          <div className="logo-text flex flex-col leading-none">
            <span className="font-black text-sm text-slate-800 tracking-tight">聆析护盾</span>
            <span className="text-[8px] font-bold text-accent-600 uppercase tracking-[0.15em] mt-0.5">Fraud Defense Console</span>
          </div>
        </Link>

        {/* 主导航 */}
        <nav className="sidebar-nav">
          {getNavItems().map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="item-icon" />
              <span className="item-label">{item.label}</span>
            </Link>
          ))}

          {/* 分隔线 */}
          <div className="h-px bg-slate-200 mx-4 my-2" />

          {/* 搜索 */}
          <button onClick={() => setSearchOpen(true)} className="sidebar-item">
            <MagnifyingGlassCircleIcon className="item-icon" />
            <span className="item-label">搜索</span>
          </button>

          {/* 通知 */}
          <button onClick={handleNotificationClick} className="sidebar-item relative">
            <BellAlertIcon className="item-icon" />
            <span className="item-label">通知</span>
            {pendingAlerts > 0 && (
              <span className="absolute left-8 top-1 min-w-[16px] h-4 px-1 bg-danger-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {pendingAlerts > 99 ? '99+' : pendingAlerts}
              </span>
            )}
          </button>
        </nav>

        {/* 底部区域：模式 + 用户 */}
        <div className="sidebar-bottom">
          {/* 模式切换 */}
          <div className="relative" ref={modeMenuRef}>
            <button onClick={() => setModeMenuOpen((open) => !open)} className="sidebar-item" title={`当前为${modeLabels[mode]}`}> 
              {(() => { const MIcon = modeIcons[mode]; return <MIcon className="item-icon" />; })()}
              <span className="item-label">{modeLabels[mode]}</span>
            </button>
            {modeMenuOpen && (
              <div className="sidebar-mode-panel">
                {(['standard', 'elder', 'minor'] as UserMode[]).map((candidateMode) => {
                  const Icon = modeIcons[candidateMode];
                  return (
                    <button
                      key={candidateMode}
                      onClick={() => handleModeSelect(candidateMode)}
                      className={`sidebar-mode-option ${mode === candidateMode ? 'active' : ''}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{modeLabels[candidateMode]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 用户 */}
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="sidebar-item">
              <div className="sidebar-avatar">{user?.username?.charAt(0).toUpperCase() || 'U'}</div>
              <span className="item-label truncate">{user?.username || '用户'}</span>
            </button>
            {userMenuOpen && (
              <div className="dropdown left-full bottom-0 ml-2">
                <div className="px-3 py-2 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-800">{user?.username || '用户'}</p>
                  <p className="text-xs text-slate-400">{user?.email || ''}</p>
                </div>
                <Link to="/profile" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <UserCircleIcon className="w-5 h-5" /> 个人资料
                </Link>
                <Link to="/settings" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <Cog6ToothIcon className="w-5 h-5" /> 系统设置
                </Link>
                <div className="dropdown-divider" />
                <button className="dropdown-item w-full text-danger-600 hover:text-danger-700 hover:bg-danger-50" onClick={handleLogout}>
                  <ArrowRightOnRectangleIcon className="w-5 h-5" /> 退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 移动端侧栏遮罩 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ====== 顶部透明状态条 ====== */}
      <header className="status-bar">
        <div className="status-bar-left">
          {/* 移动端菜单按钮 */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-500 hover:text-slate-700 transition-colors">
            {mobileMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
          <div className="status-indicator">
            <span className="status-dot online" />
            <span>SYSTEM ONLINE</span>
          </div>
          <div className="status-indicator hidden sm:flex">
            <span className="text-accent-600 font-semibold">{formatTime(currentTime)}</span>
            <span className="text-slate-400 ml-1">{formatDate(currentTime)}</span>
          </div>
        </div>
        <div className="status-bar-right">
          <div className="status-indicator hidden sm:flex">
            <span>聆析护盾</span>
          </div>
          <button onClick={handleSOS} disabled={sosLoading} className="sos-btn">
            {sosLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <ShieldExclamationIcon className="w-3.5 h-3.5" />
            )}
            <span>SOS</span>
          </button>
        </div>
      </header>

      {/* ====== 主内容区域 ====== */}
      <main className={`main-content ${isTransitioning ? 'opacity-50' : ''}`} style={{ transition: 'opacity 0.15s ease' }}>
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>

      {/* ====== 底部 Dock 栏 ====== */}
      <div className="dock-bar">
        <div className="dock-container">
          {getNavItems().map((item) => (
            <Link key={item.path} to={item.path} className={`dock-item ${isActive(item.path) ? 'active' : ''}`}>
              <item.icon className="dock-icon" />
              <span className="dock-tooltip">{item.label}</span>
            </Link>
          ))}
          {/* Dock 分隔点 */}
          <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />
          <Link to="/profile" className={`dock-item ${isActive('/profile') ? 'active' : ''}`}>
            <UserCircleIcon className="dock-icon" />
            <span className="dock-tooltip">个人资料</span>
          </Link>
          <Link to="/settings" className={`dock-item ${isActive('/settings') ? 'active' : ''}`}>
            <Cog6ToothIcon className="dock-icon" />
            <span className="dock-tooltip">设置</span>
          </Link>
        </div>
      </div>

      {/* ====== 全局搜索 Modal ====== */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <MagnifyingGlassIcon className="w-5 h-5 text-accent-600" />
                <input ref={searchInputRef} type="text" placeholder="搜索功能或页面..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm" />
                <button onClick={() => setSearchOpen(false)} className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded font-mono">ESC</button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {searchQuery.trim() === '' ? (
                <div className="p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3 font-mono">快捷导航</p>
                  <div className="space-y-0.5">
                    {searchableItems.slice(0, 6).map((item) => (
                      <button key={item.path} onClick={() => handleSearchSelect(item.path)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors">
                        <span className="text-slate-700 text-sm">{item.label}</span>
                        <span className="ml-auto text-[10px] text-slate-400 font-mono">{item.path}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : filteredSearchItems.length > 0 ? (
                <div className="p-4 space-y-0.5">
                  {filteredSearchItems.map((item) => (
                    <button key={item.path} onClick={() => handleSearchSelect(item.path)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent-50 text-left transition-colors">
                      <MagnifyingGlassIcon className="w-4 h-4 text-accent-600" />
                      <span className="text-slate-700 text-sm">{item.label}</span>
                      <span className="ml-auto text-[10px] text-slate-400 font-mono">{item.path}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">未找到匹配的功能</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 监护人预警弹窗 */}
      {showGuardianAlert && (
        <GuardianAlertModal onClose={() => setShowGuardianAlert(false)} />
      )}
    </div>
  );
}
