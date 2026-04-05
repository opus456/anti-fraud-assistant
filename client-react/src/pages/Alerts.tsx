import { useState } from 'react';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XMarkIcon,
  
} from '@heroicons/react/24/outline';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  level: 'high' | 'medium' | 'low';
  status: 'pending' | 'handled' | 'dismissed';
  source: 'call' | 'message' | 'detection';
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: '投资诈骗',
    title: '检测到高风险投资信息',
    message: '来自400-888-9999的通话中提及"稳定高收益投资"，符合投资诈骗特征。',
    time: '10分钟前',
    level: 'high',
    status: 'pending',
    source: 'call',
  },
  {
    id: '2',
    type: '刷单诈骗',
    title: '可疑兼职信息',
    message: '短信内容包含"日结工资"、"在家赚钱"等关键词，疑似刷单诈骗。',
    time: '1小时前',
    level: 'medium',
    status: 'pending',
    source: 'message',
  },
  {
    id: '3',
    type: '冒充公检法',
    title: '疑似冒充公检法诈骗',
    message: '检测到通话中有"涉及案件"、"配合调查"等诱导性话术。',
    time: '2小时前',
    level: 'high',
    status: 'handled',
    source: 'call',
  },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [filter, setFilter] = useState<'all' | 'pending' | 'handled'>('all');

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.status === filter;
  });

  const handleAlert = (id: string, action: 'handle' | 'dismiss') => {
    setAlerts(alerts.map(alert =>
      alert.id === id
        ? { ...alert, status: action === 'handle' ? 'handled' : 'dismissed' }
        : alert
    ));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'safe';
      default: return 'primary';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'call': return PhoneIcon;
      case 'message': return ChatBubbleLeftRightIcon;
      default: return BellAlertIcon;
    }
  };

  const pendingCount = alerts.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="content-header">
        <h1 className="page-title">预警中心</h1>
        <p className="page-subtitle">查看和处理安全预警</p>
      </div>

      {/* 统计卡片 */}
      <div className="card-grid-3">
        <div className="stat-card">
          <div className="stat-icon bg-danger-100">
            <ExclamationTriangleIcon className="w-6 h-6 text-danger-500" />
          </div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">待处理预警</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-safe-100">
            <CheckCircleIcon className="w-6 h-6 text-safe-500" />
          </div>
          <div className="stat-value">{alerts.filter(a => a.status === 'handled').length}</div>
          <div className="stat-label">已处理</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-primary-100">
            <ShieldCheckIcon className="w-6 h-6 text-primary-500" />
          </div>
          <div className="stat-value">98%</div>
          <div className="stat-label">防护率</div>
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-text-muted">筛选：</span>
          {[
            { id: 'all', label: '全部' },
            { id: 'pending', label: '待处理' },
            { id: 'handled', label: '已处理' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as typeof filter)}
              className={`px-4 py-2 rounded-btn font-medium transition-colors ${
                filter === item.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-100 text-text-body hover:bg-surface-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 预警列表 */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const SourceIcon = getSourceIcon(alert.source);
            const levelColor = getLevelColor(alert.level);
            
            return (
              <div
                key={alert.id}
                className={`p-5 rounded-card border-l-4 bg-surface-50 ${
                  alert.level === 'high' ? 'border-danger-500' :
                  alert.level === 'medium' ? 'border-warning-500' : 'border-safe-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${levelColor}-100`}>
                    <SourceIcon className={`w-6 h-6 text-${levelColor}-500`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`status-badge status-${levelColor}`}>
                        {alert.type}
                      </span>
                      <span className="text-sm text-text-muted">{alert.time}</span>
                    </div>
                    <h3 className="font-semibold text-text-title mb-1">{alert.title}</h3>
                    <p className="text-text-body text-sm">{alert.message}</p>
                  </div>

                  {alert.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAlert(alert.id, 'handle')}
                        className="btn btn-sm btn-safe"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        处理
                      </button>
                      <button
                        onClick={() => handleAlert(alert.id, 'dismiss')}
                        className="btn btn-sm btn-ghost"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {alert.status === 'handled' && (
                    <span className="status-badge status-safe">已处理</span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="text-center py-12">
              <ShieldCheckIcon className="w-16 h-16 mx-auto text-surface-300 mb-4" />
              <p className="text-text-muted">暂无预警信息</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

