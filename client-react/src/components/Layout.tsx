import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useModeStore, UserMode } from '../store/modeStore';
import { useAuthStore } from '../store';
import { useSettingsStore, initializeSettings } from '../store/settingsStore';
import { NavbarAnimation, PageTransition } from './motion';
import GuardianAlertModal from './GuardianAlertModal';
import api from '../api';
import toast from 'react-hot-toast';
import {
  HomeIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  BellAlertIcon,
  ClockIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  AcademicCapIcon,
  MagnifyingGlassCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';

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
  // 引入 settingsStore 用于初始化和将来扩展
  useSettingsStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [showGuardianAlert, setShowGuardianAlert] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [hasCheckedAlerts, setHasCheckedAlerts] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);
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

  // 初始化设置和获取预警数量
  useEffect(() => {
    initializeSettings();
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
        setQuickOpen(false);
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
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setQuickOpen(false);
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

  return (
    <div className={`min-h-screen ${getModeClass()}`}>
      {/* 顶部导航栏 - 带入场动画 */}
      <NavbarAnimation>
        <nav className="navbar">
          {/* Logo */}
          <Link to="/" className="navbar-logo group">
            <div className="logo-mark">
              <img src={logo} alt="御见" className="logo-mark-img" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-[1.05rem] sm:text-[1.15rem] text-slate-900 tracking-tight"><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500"></span>御见</span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">AI Guardian</span>
            </div>
          </Link>

          {/* 桌面端导航菜单 */}
          <div className="navbar-nav">
            {getNavItems().map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`navbar-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* 右侧操作区 */}
          <div className="navbar-actions">
            {/* 搜索按钮 - 点击打开搜索框 */}
            <button 
              className="navbar-icon-btn hidden sm:flex" 
              title="搜索"
              onClick={() => setSearchOpen(true)}
            >
              <MagnifyingGlassCircleIcon className="w-5 h-5" />
            </button>

            {/* 通知按钮 - 点击跳转到预警中心 */}
            <button 
              className="navbar-icon-btn relative" 
              title="查看风险通知"
              onClick={handleNotificationClick}
            >
              <BellAlertIcon className="w-5 h-5" />
              {pendingAlerts > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-danger-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {pendingAlerts > 99 ? '99+' : pendingAlerts}
                </span>
              )}
            </button>

            {/* 快捷入口（所有模式可见，但内容随模式调整） */}
            {(['standard','elder','minor'] as UserMode[]).includes(mode) && (
              <div className="relative hidden sm:block" ref={quickMenuRef}>
                <button
                  onClick={() => setQuickOpen(!quickOpen)}
                  className="navbar-icon-btn flex items-center gap-2 !w-auto !px-3"
                  aria-haspopup="menu"
                  aria-expanded={quickOpen}
                  title="快捷入口"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span className="hidden md:block text-sm">快捷</span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${quickOpen ? 'rotate-180' : ''}`} />
                </button>

                {quickOpen && (
                  <div className="absolute right-0 top-full mt-2 min-w-[220px] bg-white border border-slate-100 rounded-lg shadow-lg py-1 z-50">
                    {mode === 'elder' ? (
                      <>
                        <Link to="/alerts" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>一键求助 / 通知</Link>
                        <Link to="/monitor" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>实时监控</Link>
                        <Link to="/family" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>家庭守护</Link>
                        <Link to="/history" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>检测记录</Link>
                      </>
                    ) : mode === 'minor' ? (
                      <>
                        <Link to="/knowledge" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>安全课堂</Link>
                        <Link to="/detection" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>充值/交易监控</Link>
                        <Link to="/family" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>家长提醒</Link>
                        <Link to="/visualization" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>数据大屏</Link>
                      </>
                    ) : (
                      <>
                        <Link to="/family" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>家庭守护</Link>
                        <Link to="/monitor" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>实时监控</Link>
                        <Link to="/history" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>检测记录</Link>
                        <Link to="/reports" className="block px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => setQuickOpen(false)}>报表</Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 模式选择器 - 移动端隐藏 */}
            <div className="relative hidden sm:block" ref={modeMenuRef}>
              <button
                onClick={() => setModeMenuOpen(!modeMenuOpen)}
                className="navbar-icon-btn flex items-center gap-1 !w-auto !px-3"
                title="切换模式"
              >
                {(() => {
                  const ModeIcon = modeIcons[mode];
                  return <ModeIcon className="w-5 h-5" />;
                })()}
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${modeMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {modeMenuOpen && (
                <div className="dropdown right-0 top-full mt-2">
                  {(['standard', 'elder', 'minor'] as UserMode[]).map((m) => {
                    const Icon = modeIcons[m];
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setMode(m);
                          setModeMenuOpen(false);
                        }}
                        className={`dropdown-item w-full ${mode === m ? 'text-sky-500 bg-sky-50' : ''}`}
                      >
                        <Icon className="w-5 h-5" />
                        {modeLabels[m]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 用户头像 - 移动端隐藏 */}
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="navbar-avatar"
                title="用户菜单"
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </button>
              
              {userMenuOpen && (
                <div className="dropdown user-dropdown right-0 top-full mt-2">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.username || '用户'}</p>
                    <p className="text-xs text-gray-500">{user?.email || ''}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    个人资料
                  </Link>
                  <Link
                    to="/settings"
                    className="dropdown-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                    系统设置
                  </Link>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item w-full text-danger-500 hover:text-danger-600 hover:bg-danger-50"
                    onClick={handleLogout}
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    退出登录
                  </button>
                </div>
              )}
            </div>

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="navbar-icon-btn md:hidden"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </nav>
      </NavbarAnimation>

      {/* 移动端侧滑菜单 */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-[280px] max-w-[85vw] bg-white border-l border-gray-200 z-50 md:hidden shadow-lg overflow-y-auto">
            {/* 移动端菜单头部 - 用户信息 */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{user?.username || '用户'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 模式选择器 - 移动端专用 */}
            <div className="p-3 border-b border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wider px-2 mb-2">模式选择</p>
              <div className="flex gap-2">
                {(['standard', 'elder', 'minor'] as UserMode[]).map((m) => {
                  const Icon = modeIcons[m];
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center ${
                        mode === m 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium leading-tight">{m === 'standard' ? '标准' : m === 'elder' ? '长辈' : '青少年'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 移动端快捷入口（所有模式） */}
            {(['standard','elder','minor'] as UserMode[]).includes(mode) && (
              <div className="p-3 border-b border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider px-2 mb-2">快捷入口</p>
                <div className="space-y-1">
                  {mode === 'elder' ? (
                    <>
                      <Link to="/alerts" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white w-full text-sm">
                        <BellAlertIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">一键求助</span>
                      </Link>
                      <Link to="/monitor" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">实时监控</span>
                      </Link>
                      <Link to="/family" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <UserGroupIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">家庭守护</span>
                      </Link>
                      <Link to="/history" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <ClockIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">检测记录</span>
                      </Link>
                    </>
                  ) : mode === 'minor' ? (
                    <>
                      <Link to="/knowledge" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <AcademicCapIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">安全课堂</span>
                      </Link>
                      <Link to="/detection" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <MagnifyingGlassIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">安全检测</span>
                      </Link>
                      <Link to="/family" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <UserGroupIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">家长提醒</span>
                      </Link>
                      <Link to="/visualization" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">数据大屏</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/detection" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white w-full text-sm">
                        <MagnifyingGlassIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">智能检测</span>
                      </Link>
                      <Link to="/alerts" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <BellAlertIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">预警中心</span>
                      </Link>
                      <Link to="/family" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <UserGroupIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">家庭守护</span>
                      </Link>
                      <Link to="/visualization" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 w-full text-sm">
                        <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium truncate">数据大屏</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* 导航菜单项 */}
            <div className="p-3 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wider px-2 mb-2">导航菜单</p>
              {getNavItems().map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{item.label}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
            
            {/* 设置和账户 */}
            <div className="p-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wider px-2 mb-2">账户设置</p>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                <UserCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">个人资料</span>
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">系统设置</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all w-full"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">退出登录</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 主内容区域 */}
      <main 
        className={`main-content ${isTransitioning ? 'opacity-50' : ''}`}
        style={{ transition: 'opacity 0.15s ease' }}
      >
        <div className="max-w-7xl mx-auto px-0 sm:px-0">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </div>
      </main>

      {/* 全局搜索 Modal */}
      {searchOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 搜索输入框 */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜索功能或页面..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                />
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded"
                >
                  ESC
                </button>
              </div>
            </div>

            {/* 搜索结果 */}
            <div className="max-h-80 overflow-y-auto">
              {searchQuery.trim() === '' ? (
                <div className="p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">快捷导航</p>
                  <div className="space-y-1">
                    {searchableItems.slice(0, 5).map((item) => (
                      <button
                        key={item.path}
                        onClick={() => handleSearchSelect(item.path)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                      >
                        <span className="text-slate-700">{item.label}</span>
                        <span className="ml-auto text-xs text-slate-400">{item.path}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : filteredSearchItems.length > 0 ? (
                <div className="p-4 space-y-1">
                  {filteredSearchItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleSearchSelect(item.path)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sky-50 text-left transition-colors"
                    >
                      <MagnifyingGlassIcon className="w-4 h-4 text-sky-500" />
                      <span className="text-slate-700">{item.label}</span>
                      <span className="ml-auto text-xs text-slate-400">{item.path}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p>未找到匹配的功能</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 一键求助浮动按钮 */}
      <button
        onClick={handleSOS}
        disabled={sosLoading}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group disabled:opacity-60"
        title="一键求助"
      >
        {sosLoading ? (
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        ) : (
          <span className="text-xl font-black">SOS</span>
        )}
        <span className="absolute bottom-full mb-2 right-0 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">一键求助</span>
      </button>

      {/* 监护人预警弹窗 - 登录后自动检测 */}
      {showGuardianAlert && (
        <GuardianAlertModal onClose={() => setShowGuardianAlert(false)} />
      )}
    </div>
  );
}
