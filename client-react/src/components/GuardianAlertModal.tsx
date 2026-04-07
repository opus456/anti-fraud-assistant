/**
 * 监护人预警弹窗组件
 * 当监护人登录后，如果有被守护者的风险预警，立即弹窗提醒
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellAlertIcon,
  XMarkIcon,
  ShieldExclamationIcon,
  UserIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface WardAlert {
  id: number;
  title: string;
  description?: string;
  risk_level: number;
  fraud_type: string;
  suggestion?: string;
  created_at: string;
  ward_user_id: number;
  ward_username?: string;
  ward_nickname?: string;
}

interface GuardianAlertModalProps {
  onClose: () => void;
}

export default function GuardianAlertModal({ onClose }: GuardianAlertModalProps) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<WardAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await api.get('/guardians/pending-alerts');
      if (res.data?.recent_alerts?.length > 0) {
        setAlerts(res.data.recent_alerts);
      }
    } catch (err) {
      console.error('加载预警失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLabel = (level: number) => {
    switch (level) {
      case 3: return { text: '极高风险', color: 'text-red-700 bg-red-100' };
      case 2: return { text: '高风险', color: 'text-red-600 bg-red-100' };
      case 1: return { text: '中风险', color: 'text-amber-600 bg-amber-100' };
      default: return { text: '低风险', color: 'text-green-600 bg-green-100' };
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '刚刚';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleViewAll = () => {
    onClose();
    navigate('/alerts');
  };

  if (loading || alerts.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <motion.div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
        />

        {/* 弹窗内容 */}
        <motion.div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* 顶部警告条 */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                <BellAlertIcon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">⚠️ 监护预警通知</h2>
                <p className="text-white/90 text-sm">
                  您的被守护者检测到 {alerts.length} 条风险预警
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* 预警列表 */}
          <div className="p-6 max-h-[400px] overflow-y-auto">
            <div className="space-y-4">
              {alerts.map((alert, index) => {
                const risk = getRiskLabel(alert.risk_level);
                return (
                  <motion.div
                    key={alert.id}
                    className="p-4 rounded-xl bg-red-50 border border-red-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <ShieldExclamationIcon className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${risk.color}`}>
                            {risk.text}
                          </span>
                          {alert.fraud_type && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                              {alert.fraud_type}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-800 text-sm mb-1">
                          {alert.title}
                        </h3>
                        {/* 显示被守护者信息 */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5" />
                            被守护者: {alert.ward_nickname || alert.ward_username || `用户#${alert.ward_user_id}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formatTime(alert.created_at)}
                          </span>
                        </div>
                        {/* 显示风险描述 */}
                        {alert.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                            {alert.description}
                          </p>
                        )}
                        {/* 显示建议 */}
                        {alert.suggestion && (
                          <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                            💡 {alert.suggestion.split('\n')[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              请及时处理这些风险预警
            </p>
            <button
              onClick={handleViewAll}
              className="btn btn-primary flex items-center gap-2"
            >
              查看全部预警
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
