import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useModeStore, UserMode } from '../store/modeStore';
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

export default function Layout() {
  const location = useLocation();
  const { mode, setMode, isTransitioning } = useModeStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

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
      {/* 毛玻璃顶部导航栏 */}
      <nav className="navbar">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-neon-500 flex items-center justify-center shadow-glow-cyan">
            <ShieldCheckIcon className="w-6 h-6 text-dark" />
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
          {/* 搜索按钮 */}
          <button className="navbar-icon-btn" title="搜索">
            <MagnifyingGlassCircleIcon className="w-5 h-5" />
          </button>

          {/* 通知按钮 */}
          <button className="navbar-icon-btn relative" title="通知">
            <BellAlertIcon className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </button>

          {/* 模式选择器 */}
          <div className="relative" ref={modeMenuRef}>
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
                      className={`dropdown-item w-full ${mode === m ? 'active' : ''}`}
                    >
                      <Icon className="w-5 h-5" />
                      {modeLabels[m]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 用户头像 */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="navbar-avatar"
              title="用户菜单"
            >
              U
            </button>
            
            {userMenuOpen && (
              <div className="dropdown right-0 top-full mt-2">
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
                <div className="divider !my-2" />
                <button
                  className="dropdown-item w-full text-danger-400 hover:text-danger-300"
                  onClick={() => {
                    setUserMenuOpen(false);
                    // TODO: 调用登出逻辑
                  }}
                >
                  退出登录
                </button>
              </div>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="navbar-icon-btn lg:hidden"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>

      {/* 移动端侧滑菜单 */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-[72px] right-0 bottom-0 w-72 bg-dark-50/95 backdrop-blur-xl border-l border-card-border z-50 lg:hidden animate-fade-in">
            <div className="p-4 space-y-1">
              {getNavItems().map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? 'bg-cyan-400/10 text-cyan-400'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              
              <div className="divider" />
              
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                <span className="font-medium">设置</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all"
              >
                <UserCircleIcon className="w-5 h-5" />
                <span className="font-medium">我的</span>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* 主内容区域 */}
      <main 
        className={`main-content ${isTransitioning ? 'opacity-50' : ''}`}
        style={{ transition: 'opacity 0.15s ease' }}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
