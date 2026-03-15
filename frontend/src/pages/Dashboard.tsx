/**
 * 控制台首页 - 展示关键指标和快捷入口
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Search, Users, Activity, Clock, TrendingUp, Eye, Radar } from 'lucide-react';
import api from '../api';
import { useAuthStore } from '../store';

interface Overview {
  total_users: number;
  total_detections: number;
  total_fraud_detected: number;
  total_alerts: number;
  detection_accuracy: number;
  avg_response_time_ms: number;
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    api.get('/statistics/overview').then(({ data }) => setOverview(data)).catch(() => {});
  }, []);

  const statCards = overview ? [
    { label: '检测总次数', value: overview.total_detections.toLocaleString(), icon: Search, color: 'bg-blue-500' },
    { label: '发现诈骗', value: overview.total_fraud_detected.toLocaleString(), icon: AlertTriangle, color: 'bg-danger-500' },
    { label: '预警次数', value: overview.total_alerts.toLocaleString(), icon: Activity, color: 'bg-warning-500' },
    { label: '识别准确率', value: `${(overview.detection_accuracy * 100).toFixed(1)}%`, icon: TrendingUp, color: 'bg-safe-500' },
    { label: '平均响应时间', value: `${overview.avg_response_time_ms.toFixed(0)}ms`, icon: Clock, color: 'bg-purple-500' },
    { label: '守护用户', value: overview.total_users.toLocaleString(), icon: Users, color: 'bg-indigo-500' },
  ] : [];

  const quickActions = [
    { label: '实时监控', desc: '智能监控浏览内容，自动识别诈骗', path: '/monitor', icon: Radar, color: 'bg-danger-500' },
    { label: '文本检测', desc: '手动粘贴可疑内容进行检测', path: '/detection', icon: Search, color: 'bg-primary-500' },
    { label: '监护端门户', desc: '家属实时联动告警与应急处理', path: '/guardian-portal', icon: Shield, color: 'bg-red-600' },
    { label: '数据大屏', desc: '查看全国诈骗数据可视化', path: '/visualization', icon: Eye, color: 'bg-safe-500' },
    { label: '知识库', desc: '浏览反诈法规和案例', path: '/knowledge', icon: Shield, color: 'bg-warning-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 lg:pb-0">
      {/* 欢迎栏 */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-700 rounded-2xl p-6 md:p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              您好，{user?.nickname || user?.username} 👋
            </h1>
            <p className="text-blue-200 mt-2 text-sm md:text-base">
              反诈智能助手正在守护您的安全 · 已累计检测 {overview?.total_detections?.toLocaleString() || '...'} 次
            </p>
          </div>
          <Shield className="w-12 h-12 text-danger-400 hidden md:block" />
        </div>
        {/* 用户风险指标 */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="px-3 py-1 bg-white/10 rounded-full">
            风险分: {(user?.risk_score || 0).toFixed(2)}
          </span>
          <span className="px-3 py-1 bg-white/10 rounded-full">
            检测 {user?.total_detections || 0} 次
          </span>
          <span className="px-3 py-1 bg-white/10 rounded-full">
            检出 {user?.fraud_hits || 0} 次
          </span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all group"
              >
                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{action.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 安全提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-bold text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          每日安全提示
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-amber-700">
          <li>• 不轻信：对来路不明的电话、短信、链接保持警惕</li>
          <li>• 不透露：不向陌生人透露身份证号、银行卡号、验证码等个人信息</li>
          <li>• 不转账：涉及转账汇款时，务必通过官方渠道核实身份</li>
          <li>• 遇诈骗：请立即拨打 <strong>96110</strong> 全国反诈热线</li>
        </ul>
      </div>
    </div>
  );
}
