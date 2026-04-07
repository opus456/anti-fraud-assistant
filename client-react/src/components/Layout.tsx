import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useModeStore, UserMode } from '../store/modeStore';
import { useAuthStore } from '../store';
import { useSettingsStore, initializeSettings } from '../store/settingsStore';
import { NavbarAnimation, PageTransition } from './motion';
import GuardianAlertModal from './GuardianAlertModal';
import api from '../api';
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

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  modes?: UserMode[];
}

const navItems: NavItem[] = [
  { path: '/', label: '控制台', icon: HomeIcon },
  { path: '/detection', label: '智能检测', icon: MagnifyingGlassIcon },
  { path: '/monitor', label: '实时监控', icon: ShieldCheckIcon },
  { path: '/visualization', label: '数据大屏', icon: ChartBarIcon },
  { path: '/knowledge', label: '知识库', icon: BookOpenIcon },
  { path: '/alerts', label: '预警中心', icon: BellAlertIcon },
  { path: '/history', label: '检测记录', icon: ClockIcon },
  { path: '/family', label: '家庭守护', icon: UserGroupIcon },
];

const elderNavItems: NavItem[] = [
  { path: '/', label: '首页', icon: HomeIcon },
  { path: '/monitor', label: '通话监测', icon: ShieldCheckIcon },
  { path: '/alerts', label: '安全提醒', icon: BellAlertIcon },
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
  { label: '控制台', path: '/', keywords: ['首页', '仪表盘', 'dashboard'] },
  { label: '智能检测', path: '/detection', keywords: ['检测', '分析', 'AI', '诈骗识别'] },
  { label: '实时监控', path: '/monitor', keywords: ['监控', '通话', '短信', '监测'] },
  { label: '数据大屏', path: '/visualization', keywords: ['数据', '大屏', '可视化', '图表', '统计'] },
  { label: '知识库', path: '/knowledge', keywords: ['知识', '学习', '案例', '教程'] },
  { label: '预警中心', path: '/alerts', keywords: ['预警', '警报', '通知', '风险'] },
  { label: '检测记录', path: '/history', keywords: ['历史', '记录', '日志'] },
  { label: '家庭守护', path: '/family', keywords: ['家庭', '监护', '守护', '成员'] },
  { label: '个人资料', path: '/profile', keywords: ['资料', '账户', '个人'] },
  { label: '系统设置', path: '/settings', keywords: ['设置', '配置', '偏好'] },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [showGuardianAlert, setShowGuardianAlert] = useState(false);
  const [hasCheckedAlerts, setHasCheckedAlerts] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // ESC 关闭搜索
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    if (searchOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [searchOpen]);

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

  return (
    <div className={`min-h-screen ${getModeClass()}`}>
      {/* 顶部导航栏 - 带入场动画 */}
      <NavbarAnimation>
        <nav className="navbar">
          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-btn">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <span className="hidden sm:block">反诈守护</span>
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
                <div className="dropdown right-0 top-full mt-2">
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
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-[280px] max-w-[85vw] bg-white/98 backdrop-blur-xl border-l border-sky-100 z-50 md:hidden shadow-2xl overflow-y-auto">
            {/* 移动端菜单头部 - 用户信息 */}
            <div className="p-4 bg-gradient-to-br from-sky-50 to-white border-b border-sky-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{user?.username || '用户'}</p>
                  <p className="text-sm text-slate-500 truncate">{user?.email || ''}</p>
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
            <div className="p-3 border-b border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider px-2 mb-2">模式选择</p>
              <div className="flex gap-2">
                {(['standard', 'elder', 'minor'] as UserMode[]).map((m) => {
                  const Icon = modeIcons[m];
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        mode === m 
                          ? 'bg-sky-500 text-white shadow-md' 
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{modeLabels[m].split('模式')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* 导航菜单项 */}
            <div className="p-3 space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider px-2 mb-2">导航菜单</p>
              {getNavItems().map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? 'bg-sky-50 text-sky-600 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive(item.path) && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-sky-500" />
                  )}
                </Link>
              ))}
            </div>
            
            {/* 设置和账户 */}
            <div className="p-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider px-2 mb-2">账户设置</p>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                <UserCircleIcon className="w-5 h-5" />
                <span className="font-medium">个人资料</span>
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                <span className="font-medium">系统设置</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-danger-500 hover:bg-danger-50 transition-all w-full"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="font-medium">退出登录</span>
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

      {/* 监护人预警弹窗 - 登录后自动检测 */}
      {showGuardianAlert && (
        <GuardianAlertModal onClose={() => setShowGuardianAlert(false)} />
      )}
    </div>
  );
}
