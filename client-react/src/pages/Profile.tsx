import { useState } from 'react';
import {
  UserCircleIcon,
  PencilIcon,
  ShieldCheckIcon,
  BellIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
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
    { icon: ShieldCheckIcon, label: '安全中心', path: '/settings' },
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
      <div className="content-header">
        <h1 className="page-title">个人中心</h1>
      </div>

      {/* 用户信息卡 */}
      <div className="card">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
              <UserCircleIcon className="w-16 h-16 text-white" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-lg hover:bg-sky-500 transition-colors">
              <CameraIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{profileUser.name}</h2>
              <span className="status-badge status-primary">{profileUser.role}</span>
            </div>
            <p className="text-slate-600 mt-1">{profileUser.phone}</p>
            <p className="text-slate-500 text-sm">加入于 {profileUser.joinDate}</p>
          </div>

          <button className="btn btn-outline">
            <PencilIcon className="w-4 h-4" />
            编辑资料
          </button>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="bento-grid-3">
        <div className="stat-card text-center">
          <div className="stat-value text-sky-600">{profileUser.stats.detections}</div>
          <div className="stat-label">检测次数</div>
        </div>
        <div className="stat-card text-center">
          <div className="stat-value text-red-600">{profileUser.stats.blocked}</div>
          <div className="stat-label">拦截风险</div>
        </div>
        <div className="stat-card text-center">
          <div className="stat-value text-green-600">{profileUser.stats.protected}</div>
          <div className="stat-label">守护家人</div>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="card">
        <div className="space-y-1">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                <item.icon className="w-5 h-5 text-sky-600" />
              </div>
              <span className="flex-1 font-medium text-slate-800">{item.label}</span>
              <ChevronRightIcon className="w-5 h-5 text-slate-500 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
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
