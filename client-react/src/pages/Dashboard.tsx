import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Search, BarChart3, BookOpen, Bell, FileText,
  TrendingUp, Users, ShieldCheck, AlertTriangle, Activity, Eye,
} from 'lucide-react';
import api from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

interface OverviewStats {
  total_detections: number;
  fraud_detected: number;
  safe_detected: number;
  total_users: number;
  active_alerts: number;
  knowledge_entries: number;
}

interface OverviewApiResponse {
  total_users?: number;
  total_detections?: number;
  total_fraud_detected?: number;
  total_alerts?: number;
}

const defaultStats: OverviewStats = {
  total_detections: 0, fraud_detected: 0, safe_detected: 0,
  total_users: 0, active_alerts: 0, knowledge_entries: 0,
};

function toSafeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeOverviewStats(data: OverviewApiResponse): OverviewStats {
  const totalDetections = toSafeNumber(data.total_detections);
  const fraudDetected = toSafeNumber(data.total_fraud_detected);

  return {
    total_detections: totalDetections,
    fraud_detected: fraudDetected,
    safe_detected: Math.max(totalDetections - fraudDetected, 0),
    total_users: toSafeNumber(data.total_users),
    active_alerts: toSafeNumber(data.total_alerts),
    knowledge_entries: 0,
  };
}

const quickActions = [
  { path: '/detection', label: '智能检测', desc: '检测可疑信息', icon: Search, color: 'bg-blue-500' },
  { path: '/monitor', label: '实时监控', desc: '剪贴板监控', icon: Eye, color: 'bg-green-500' },
  { path: '/visualization', label: '数据大屏', desc: '可视化分析', icon: BarChart3, color: 'bg-purple-500' },
  { path: '/knowledge', label: '知识库', desc: '防骗知识', icon: BookOpen, color: 'bg-amber-500' },
  { path: '/alerts', label: '预警中心', desc: '查看预警', icon: Bell, color: 'bg-red-500' },
  { path: '/reports', label: '安全报告', desc: '生成报告', icon: FileText, color: 'bg-indigo-500' },
];

const safetyTips = [
  '不要轻信来历不明的电话和短信，不要随意点击陌生链接。',
  '任何要求转账到"安全账户"的都是诈骗。',
  '网购退款、中奖通知、冒充客服等均为高频诈骗手段。',
  '遇到可疑信息，第一时间使用本系统进行检测。',
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<OverviewStats>(defaultStats);

  useEffect(() => {
    api.get('/statistics/overview')
      .then(({ data }) => setStats(normalizeOverviewStats(data)))
      .catch(() => toast.error('获取统计数据失败'));
  }, []);

  const statCards = [
    { label: '总检测数', value: stats.total_detections, icon: Activity, color: 'text-blue-600 bg-blue-50' },
    { label: '发现诈骗', value: stats.fraud_detected, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: '安全信息', value: stats.safe_detected, icon: ShieldCheck, color: 'text-green-600 bg-green-50' },
    { label: '注册用户', value: stats.total_users, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: '活跃预警', value: stats.active_alerts, icon: Bell, color: 'text-amber-600 bg-amber-50' },
    { label: '知识条目', value: stats.knowledge_entries, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <h1 className="text-2xl font-bold">
            {user ? `欢迎回来，${user.nickname || user.username}` : '欢迎使用反诈智能助手'}
          </h1>
        </div>
        <p className="text-primary-100 text-sm">
          AI 驱动的智能反诈检测系统，实时守护您的信息安全。
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-white ${action.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-medium text-gray-800 text-sm group-hover:text-primary-600">{action.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Safety tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5" /> 安全小贴士
        </h2>
        <ul className="space-y-2">
          {safetyTips.map((tip, i) => (
            <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
              <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
