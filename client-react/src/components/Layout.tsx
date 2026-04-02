/**
 * 主布局组件 - 精简侧边栏 + 顶部用户信息栏
 * 响应式设计：桌面端侧边栏，移动端底部 5 个标签
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store';
import {
  Shield,
  Search,
  History,
  BookOpen,
  Users,
  FileText,
  Bell,
  User,
  LogOut,
  LogIn,
  Menu,
  X,
  Home,
  Radar,
  Eye,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  ChevronDown,
  Smartphone,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

/** 分组导航 */
const navGroups: NavGroup[] = [
  {
    title: '核心功能',
    items: [
      { path: '/', label: '控制台', icon: Home },
      { path: '/monitor', label: '实时监控', icon: Radar },
      { path: '/detection', label: '智能检测', icon: Search },
    ],
  },
  {
    title: '数据分析',
    items: [
      { path: '/history', label: '检测记录', icon: History },
      { path: '/visualization', label: '数据大屏', icon: Eye },
      { path: '/alerts', label: '预警中心', icon: Bell },
      { path: '/sms-inbox', label: '手机短信', icon: Smartphone },
    ],
  },
  {
    title: '资源中心',
    items: [
      { path: '/knowledge', label: '知识库', icon: BookOpen },
      { path: '/reports', label: '安全报告', icon: FileText },
    ],
  },
  {
    title: '个人设置',
    items: [
      { path: '/guardians', label: '监护人', icon: Users },
      { path: '/profile', label: '我的画像', icon: User },
    ],
  },
];

/** 角色专属入口 */
const roleNavItems: NavItem[] = [
  {
    path: '/guardian-dashboard',
    label: '监护面板',
    icon: LayoutDashboard,
    roles: ['guardian', 'admin'],
  },
  {
    path: '/admin',
    label: '管理后台',
    icon: Settings,
    roles: ['admin'],
  },
];

/** 移动端底部 5 个标签 - 保持平铺引用 */
const mobileNavItems: NavItem[] = [
  { path: '/', label: '控制台', icon: Home },
  { path: '/monitor', label: '监控', icon: Radar },
  { path: '/detection', label: '检测', icon: Search },
  { path: '/alerts', label: '预警', icon: Bell },
  { path: '/profile', label: '我的', icon: User },
];

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  /** 判断当前路径是否匹配 */
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  /** 根据角色过滤的专属入口 */
  const visibleRoleItems = roleNavItems.filter(
    (item) => user?.role && item.roles?.includes(user.role),
  );

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex">
      {/* ===== 桌面端侧边栏 ===== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-primary-950 text-white
          transform transition-all duration-300 ease-out flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center justify-between px-4 py-5 border-b border-primary-800/50 ${sidebarCollapsed ? 'px-3' : 'px-5'}`}>
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-danger-500 to-danger-600 rounded-xl flex items-center justify-center shadow-lg shadow-danger-500/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">反诈助手</h1>
                <p className="text-xs text-primary-400">AI守护您的安全</p>
              </div>
            )}
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-primary-800"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4">
              {!sidebarCollapsed && (
                <p className="px-5 mb-2 text-xs font-semibold text-primary-500 uppercase tracking-wider">
                  {group.title}
                </p>
              )}
              <div className="space-y-1 px-3">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200 text-sm group relative
                        ${sidebarCollapsed ? 'justify-center' : ''}
                        ${
                          active
                            ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : 'text-primary-300 hover:bg-primary-800/50 hover:text-white'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${active ? '' : 'group-hover:scale-110 transition-transform'}`} />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                      {/* 收起时的tooltip */}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-primary-800 text-white text-xs rounded-lg
                                        opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all
                                        whitespace-nowrap z-50 shadow-lg">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 角色专属入口 */}
          {visibleRoleItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary-800/50">
              {!sidebarCollapsed && (
                <p className="px-5 mb-2 text-xs font-semibold text-warning-500 uppercase tracking-wider">
                  管理功能
                </p>
              )}
              <div className="space-y-1 px-3">
                {visibleRoleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200 text-sm group relative
                        ${sidebarCollapsed ? 'justify-center' : ''}
                        ${
                          active
                            ? 'bg-gradient-to-r from-warning-600 to-warning-500 text-white shadow-lg'
                            : 'text-primary-300 hover:bg-primary-800/50 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* 侧边栏收起按钮（桌面端） */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center py-3 border-t border-primary-800/50
                     text-primary-400 hover:text-white hover:bg-primary-800/50 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== 主内容区 ===== */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* 顶部栏 - 移动端和桌面端都显示 */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            {/* 左侧 - Logo和菜单 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div className="lg:hidden flex items-center gap-2">
                <Shield className="w-6 h-6 text-danger-500" />
                <span className="font-bold text-primary-900">反诈助手</span>
              </div>
              {/* 桌面端显示页面标题 */}
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-slate-800">
                  {navGroups.flatMap(g => g.items).find(item => isActive(item.path))?.label || '控制台'}
                </h2>
              </div>
            </div>

            {/* 右侧 - 用户信息 */}
            <div className="flex items-center gap-3">
              {/* 安全状态指示器 */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-safe-50 border border-safe-200 rounded-full">
                <div className="w-2 h-2 bg-safe-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-safe-700">系统正常</span>
              </div>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 
                                    flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {user.nickname?.[0] || user.username?.[0] || '?'}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-slate-700 leading-tight">
                        {user.nickname || user.username}
                      </p>
                      <p className="text-xs text-slate-400">{user.role === 'admin' ? '管理员' : user.role === 'guardian' ? '监护人' : '用户'}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 下拉菜单 */}
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-slide-down">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-medium text-slate-800">{user.nickname || user.username}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <UserCircle className="w-4 h-4" />
                            我的画像
                          </Link>
                          <Link
                            to="/reports"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            安全报告
                          </Link>
                        </div>
                        <div className="border-t border-slate-100 pt-1">
                          <button
                            onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" />
                            退出登录
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 
                           hover:from-primary-700 hover:to-primary-800 text-white rounded-xl text-sm font-medium 
                           shadow-lg shadow-primary-500/25 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">登录</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* 页面内容 - 可滚动区域 */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-20 lg:pb-8 scroll-smooth">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* ===== 移动端底部导航 (5 tabs) ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="flex">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium
                  transition-colors relative
                  ${active ? 'text-primary-600' : 'text-slate-400'}
                `}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full" />
                )}
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
