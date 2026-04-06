import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  CheckCircleIcon,
  PhoneIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface ProtectionAction {
  type: 'blocked' | 'notified' | 'alerted' | 'logged';
  message: string;
  target?: string;
}

interface RiskWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskLevel: 'high' | 'medium';
  riskScore: number;
  fraudType: string;
  fraudTypeLabel: string;
  analysis: string;
  warningScripts: string[];
  suggestions: string[];
  protectionActions: ProtectionAction[];
  keywords?: string[];
}

export default function RiskWarningModal({
  isOpen,
  onClose,
  riskLevel,
  riskScore,
  fraudTypeLabel,
  warningScripts,
  suggestions,
  protectionActions,
  keywords = [],
}: RiskWarningModalProps) {
  const isHighRisk = riskLevel === 'high';
  
  // 根据风险等级设置颜色主题
  const theme = isHighRisk
    ? {
        bgGradient: 'from-red-600 via-red-700 to-red-800',
        iconBg: 'bg-red-500',
        borderColor: 'border-red-400',
        textColor: 'text-red-100',
        badgeBg: 'bg-red-500/30',
        actionBg: 'bg-red-500/20',
        buttonBg: 'bg-white text-red-700 hover:bg-red-50',
      }
    : {
        bgGradient: 'from-amber-500 via-orange-600 to-red-600',
        iconBg: 'bg-amber-500',
        borderColor: 'border-amber-400',
        textColor: 'text-amber-100',
        badgeBg: 'bg-amber-500/30',
        actionBg: 'bg-amber-500/20',
        buttonBg: 'bg-white text-amber-700 hover:bg-amber-50',
      };

  const getActionIcon = (type: ProtectionAction['type']) => {
    switch (type) {
      case 'blocked':
        return <ShieldExclamationIcon className="w-5 h-5" />;
      case 'notified':
        return <UserGroupIcon className="w-5 h-5" />;
      case 'alerted':
        return <BellAlertIcon className="w-5 h-5" />;
      case 'logged':
        return <CheckCircleIcon className="w-5 h-5" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 背景遮罩 - 更暗的遮罩 */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 主弹窗 */}
          <motion.div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-br ${theme.bgGradient} shadow-2xl border ${theme.borderColor}`}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* 警告头部 */}
            <div className="p-8 pb-6 text-center">
              {/* 动画警告图标 */}
              <motion.div
                className={`w-24 h-24 mx-auto rounded-full ${theme.iconBg} flex items-center justify-center mb-6`}
                animate={{
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(255,255,255,0.4)',
                    '0 0 0 20px rgba(255,255,255,0)',
                    '0 0 0 0 rgba(255,255,255,0)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ExclamationTriangleIcon className="w-14 h-14 text-white" />
              </motion.div>

              {/* 标题 */}
              <motion.h2
                className="text-3xl font-bold text-white mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {isHighRisk ? '🚨 高风险警告' : '⚠️ 中风险警告'}
              </motion.h2>

              {/* 风险分数 */}
              <motion.div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${theme.badgeBg} ${theme.textColor} font-semibold mb-4`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ShieldExclamationIcon className="w-5 h-5" />
                风险评分: {Math.round(riskScore * 100)}分
              </motion.div>

              {/* 诈骗类型 */}
              {fraudTypeLabel && (
                <motion.p
                  className="text-xl text-white/90 font-medium"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  检测到：{fraudTypeLabel}
                </motion.p>
              )}
            </div>

            {/* 警告脚本 */}
            {warningScripts.length > 0 && (
              <motion.div
                className="mx-6 mb-6 p-4 rounded-2xl bg-black/20 border border-white/10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="space-y-2">
                  {warningScripts.map((script, idx) => (
                    <p key={idx} className="text-white/95 text-sm leading-relaxed">
                      {script}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 关键词高亮 */}
            {keywords.length > 0 && (
              <motion.div
                className="mx-6 mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <p className="text-white/70 text-sm mb-2">检测到的诈骗关键词：</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 系统保护动作 */}
            <motion.div
              className="mx-6 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-white/70 text-sm mb-3 flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4" />
                系统已执行的保护动作：
              </p>
              <div className="space-y-2">
                {protectionActions.map((action, idx) => (
                  <motion.div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl ${theme.actionBg} border border-white/10`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                      {getActionIcon(action.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{action.message}</p>
                      {action.target && (
                        <p className="text-white/60 text-xs">{action.target}</p>
                      )}
                    </div>
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* 安全建议 */}
            {suggestions.length > 0 && (
              <motion.div
                className="mx-6 mb-6 p-4 rounded-2xl bg-white/10"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-white/70 text-sm mb-3">安全建议：</p>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-white/90 text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* 底部操作按钮 */}
            <motion.div
              className="p-6 pt-2 flex flex-col sm:flex-row gap-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <a
                href="tel:96110"
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-red-700 font-bold text-lg hover:bg-red-50 transition-colors"
              >
                <PhoneIcon className="w-6 h-6" />
                拨打96110反诈热线
              </a>
              <button
                onClick={onClose}
                className={`flex-1 py-4 rounded-xl ${theme.buttonBg} font-bold text-lg transition-colors`}
              >
                我已知晓风险
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 导出保护动作生成函数
export function generateProtectionActions(
  riskLevel: string,
  alertActions: string[] = [],
  guardianName?: string
): ProtectionAction[] {
  const actions: ProtectionAction[] = [];

  // 基础动作：记录日志
  actions.push({
    type: 'logged',
    message: '已记录本次检测结果',
  });

  // 从后端返回的 alert_actions 生成
  for (const action of alertActions) {
    if (action.includes('短信')) {
      actions.push({
        type: 'notified',
        message: '已发送短信提醒给监护人',
        target: guardianName || '已绑定监护人',
      });
    } else if (action.includes('APP通知') || action.includes('推送')) {
      actions.push({
        type: 'alerted',
        message: '已推送APP预警通知',
      });
    } else if (action.includes('标记') || action.includes('拦截')) {
      actions.push({
        type: 'blocked',
        message: '已标记为高风险内容',
      });
    }
  }

  // 如果是高风险且没有特定动作，添加默认的保护动作
  if (riskLevel === 'high' || riskLevel === 'danger') {
    if (!actions.some(a => a.type === 'blocked')) {
      actions.unshift({
        type: 'blocked',
        message: '已自动拦截高风险内容',
      });
    }
    if (!actions.some(a => a.type === 'alerted')) {
      actions.push({
        type: 'alerted',
        message: '已触发实时预警',
      });
    }
  }

  return actions;
}
