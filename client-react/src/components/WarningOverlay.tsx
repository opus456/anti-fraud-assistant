/**
 * WarningOverlay - 全屏高危预警覆盖层
 * 当 Socket.io 推送 SHOW_WARNING 事件时展示
 */
import { ShieldAlert, Phone, X } from 'lucide-react';

interface WarningOverlayProps {
  visible: boolean;
  alertData: {
    risk_level?: number;
    scam_type?: string;
    fraud_type_label?: string;
    reason?: string;
    cot_reasoning?: string;
    warning_scripts?: string[];
    suggestions?: string[];
  } | null;
  onClose: () => void;
}

export default function WarningOverlay({ visible, alertData, onClose }: WarningOverlayProps) {
  if (!visible || !alertData) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-900/90 backdrop-blur-sm animate-pulse-once">
      {/* 背景脉冲效果 */}
      <div className="absolute inset-0 bg-red-600/20 animate-ping pointer-events-none" />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 animate-scale-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 警示图标 */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-center text-red-700 mb-2">
          高危诈骗预警
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          系统检测到高风险诈骗行为，请立即停止操作
        </p>

        {/* 诈骗类型 */}
        {alertData.fraud_type_label && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-red-700">
              诈骗类型: {alertData.fraud_type_label}
            </p>
          </div>
        )}

        {/* 原因/分析 */}
        {(alertData.reason || alertData.cot_reasoning) && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-gray-600 mb-1">AI 分析:</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {alertData.reason || alertData.cot_reasoning}
            </p>
          </div>
        )}

        {/* 警告话术 */}
        {alertData.warning_scripts && alertData.warning_scripts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-amber-700 mb-2">安全警告:</p>
            {alertData.warning_scripts.map((script, i) => (
              <p key={i} className="text-sm text-amber-800 mb-1">{script}</p>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
          >
            我知道了
          </button>
          <a
            href="tel:96110"
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Phone className="w-4 h-4" />
            拨打 96110
          </a>
        </div>
      </div>
    </div>
  );
}
