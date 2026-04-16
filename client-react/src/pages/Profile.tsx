import { useState } from 'react';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  BellIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profileUser] = useState({
    name: user?.nickname || user?.username || '守护者',
    phone: '138****5678',
    email: user?.email || 'user@example.com',
    role: user?.role === 'guardian' ? '监护人' : user?.role === 'admin' ? '管理员' : '家庭守护者',
    joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) : '2024年1月',
    stats: {
      detections: user?.total_detections || 156,
      blocked: user?.fraud_hits || 23,
      protected: 4,
    },
  });

  const menuItems = [
    { icon: ShieldCheckIcon, label: '用户资料', path: '/settings' },
    { icon: BellIcon, label: '通知设置', path: '/settings' },
    { icon: ClockIcon, label: '检测记录', path: '/history' },
    { icon: DocumentTextIcon, label: '安全报告', path: '/reports' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner - 蓝色 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a1e3d] via-[#0d2847] to-[#0a2540] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 text-white/[0.03]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
              <UserCircleIcon className="w-12 h-12 text-white" />
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg hover:bg-sky-400 transition-colors">
              <CameraIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{profileUser.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 text-xs font-medium">{profileUser.role}</span>
            </div>
            <p className="text-white/40 text-sm">{profileUser.email} · 加入于 {profileUser.joinDate}</p>
            <div className="flex items-center gap-6 mt-3">
              <div><span className="text-2xl font-bold text-white">{profileUser.stats.detections}</span><span className="text-white/40 text-xs ml-1.5">检测</span></div>
              <div><span className="text-2xl font-bold text-red-400">{profileUser.stats.blocked}</span><span className="text-white/40 text-xs ml-1.5">拦截</span></div>
              <div><span className="text-2xl font-bold text-emerald-400">{profileUser.stats.protected}</span><span className="text-white/40 text-xs ml-1.5">守护</span></div>
            </div>
          </div>
        </div>

        {/* 编辑资料按钮：已移动到设置页顶部卡片右上（此处不再显示） */}
      </div>

      {/* 菜单列表：紧凑网格，避免卡片垂直撑开 */}
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                <item.icon className="w-6 h-6 text-sky-600" />
              </div>
              <span className="font-medium text-slate-800">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="w-full card hover:bg-red-50 hover:border-red-200 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <span className="font-medium text-red-600">退出登录</span>
        </div>
      </button>
    </div>
  );
}
