/**
 * 主布局组件 - 包含侧边栏导航和顶部栏
 * 响应式设计：移动端为底部导航,桌面端为侧边栏
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import {
  Shield, Search, BarChart3, History, BookOpen, Users,
  FileText, Bell, User, LogOut, LogIn, Menu, X, Home, Radar
} from 'lucide-react';

const navItems = [
  { path: '/', label: '控制台', icon: Home },
  { path: '/monitor', label: '实时监控', icon: Radar },
  { path: '/detection', label: '智能检测', icon: Search },
  { path: '/history', label: '检测记录', icon: History },
  { path: '/visualization', label: '数据大屏', icon: BarChart3 },
  { path: '/knowledge', label: '知识库', icon: BookOpen },
  { path: '/alerts', label: '预警中心', icon: Bell },
  { path: '/guardians', label: '监护人', icon: Users },
  { path: '/reports', label: '安全报告', icon: FileText },
  { path: '/profile', label: '我的画像', icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ===== 桌面端侧边栏 ===== */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-primary-900 text-white
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
          <Shield className="w-8 h-8 text-danger-500" />
          <div>
            <h1 className="text-lg font-bold">反诈智能助手</h1>
            <p className="text-xs text-gray-400">AI守护您的安全</p>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-6 py-3 mx-2 rounded-lg
                  transition-all duration-200 text-sm
                  ${isActive
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-primary-800 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 用户信息 / 登录入口 */}
        <div className="p-4 border-t border-primary-700">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold">
                  {user.nickname?.[0] || user.username?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.nickname || user.username}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-danger-400 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 w-full px-4 py-2.5 bg-primary-500 hover:bg-primary-400 rounded-lg text-sm font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              登录 / 注册
            </Link>
          )}
        </div>
      </aside>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== 主内容区 ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶部栏 */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <Shield className="w-6 h-6 text-danger-500" />
          <h1 className="text-base font-bold text-primary-900">反诈智能助手</h1>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* ===== 移动端底部导航 ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex">
        {[navItems[0], navItems[1], navItems[2], navItems[6], navItems[9]].map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex-1 flex flex-col items-center gap-1 py-2 text-xs
                ${isActive ? 'text-primary-500' : 'text-gray-500'}
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
