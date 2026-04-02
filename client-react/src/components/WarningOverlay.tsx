/**
 * WarningOverlay - 全屏高危预警覆盖层
 * 当 Socket.io 推送 SHOW_WARNING 事件时展示
 * 增强版：全屏遮挡、强制倒计时、声音警报、震动效果
 */
import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Phone, AlertOctagon, Siren, Clock, XCircle, AlertTriangle, Volume2 } from 'lucide-react';

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
    risk_score?: number;
  } | null;
  onClose: () => void;
}

export default function WarningOverlay({ visible, alertData, onClose }: WarningOverlayProps) {
  const [countdown, setCountdown] = useState(10);
  const [canClose, setCanClose] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // 重置状态
  useEffect(() => {
    if (visible) {
      setCountdown(10);
      setCanClose(false);
      setAcknowledged(false);
      
      // 尝试播放警报音效
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playBeep = () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        };
        playBeep();
        setTimeout(playBeep, 600);
        setTimeout(playBeep, 1200);
      } catch (e) {
        // 音频播放失败时静默处理
      }

      // 尝试震动
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    }
  }, [visible]);

  // 倒计时
  useEffect(() => {
    if (!visible || canClose) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, canClose]);

  const handleClose = useCallback(() => {
    if (canClose && acknowledged) {
      onClose();
    }
  }, [canClose, acknowledged, onClose]);

  if (!visible || !alertData) return null;

  const riskScore = alertData.risk_score ? Math.round(alertData.risk_score * 100) : 95;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* 多层背景效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-900 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      
      {/* 动态扫描线效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,0,0,0.03)_2px,rgba(255,0,0,0.03)_4px)]" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-500/20 to-transparent animate-scan-warning" />
      </div>

      {/* 边框闪烁警告 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-4 border-4 border-red-500/50 rounded-3xl animate-border-pulse" />
        <div className="absolute inset-8 border-2 border-red-400/30 rounded-2xl animate-border-pulse-delay" />
      </div>

      {/* 主警告卡片 */}
      <div className="relative w-full max-w-2xl mx-4 animate-warning-appear">
        {/* 顶部警告条 */}
        <div className="bg-red-600 text-white py-3 px-6 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Siren className="w-6 h-6 animate-pulse" />
            <span className="font-bold text-lg">⚠️ 紧急安全警报</span>
          </div>
          <div className="flex items-center gap-2 bg-red-700/50 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{countdown}s</span>
          </div>
        </div>

        {/* 卡片主体 */}
        <div className="bg-white rounded-b-3xl shadow-2xl shadow-red-500/30 overflow-hidden">
          {/* 风险分数展示 */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 px-8 py-6 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 
                              flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse-warning">
                  <AlertOctagon className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-700">检测到高危诈骗</h2>
                  <p className="text-red-500 font-medium mt-1">
                    {alertData.fraud_type_label || '可疑诈骗行为'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-black text-red-600">{riskScore}</div>
                <div className="text-sm text-red-500 font-medium">风险指数</div>
              </div>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="p-6 space-y-4">
            {/* AI分析结果 */}
            {(alertData.reason || alertData.cot_reasoning) && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-slate-600" />
                  <span className="font-semibold text-slate-700">AI 智能分析</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {alertData.reason || alertData.cot_reasoning}
                </p>
              </div>
            )}

            {/* 警告信息 */}
            <div className="bg-red-50 rounded-2xl p-4 border-2 border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-bold text-red-700">请立即停止当前操作！</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    <li>• 不要向任何人转账汇款</li>
                    <li>• 不要透露个人银行卡、密码等信息</li>
                    <li>• 不要点击任何可疑链接</li>
                    <li>• 如有疑问请拨打反诈热线 96110</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 警告话术 */}
            {alertData.warning_scripts && alertData.warning_scripts.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-700">安全提示</span>
                </div>
                <div className="space-y-1">
                  {alertData.warning_scripts.map((script, i) => (
                    <p key={i} className="text-amber-700 text-sm">{script}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 操作区域 */}
          <div className="p-6 pt-0 space-y-4">
            {/* 确认复选框 */}
            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${acknowledged 
                              ? 'bg-safe-50 border-safe-300' 
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-safe-600 focus:ring-safe-500"
              />
              <span className={`font-medium ${acknowledged ? 'text-safe-700' : 'text-slate-600'}`}>
                我已了解风险，并将谨慎处理
              </span>
            </label>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={!canClose || !acknowledged}
                className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2
                          transition-all duration-300
                          ${canClose && acknowledged
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                {!canClose ? (
                  <>
                    <Clock className="w-5 h-5" />
                    请等待 {countdown} 秒
                  </>
                ) : !acknowledged ? (
                  <>
                    <XCircle className="w-5 h-5" />
                    请先确认已了解风险
                  </>
                ) : (
                  '我已知晓，继续操作'
                )}
              </button>
              <a
                href="tel:96110"
                className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600
                         text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2
                         shadow-lg shadow-red-500/30 transition-all"
              >
                <Phone className="w-5 h-5" />
                立即报警 96110
              </a>
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-4 text-center">
          <p className="text-red-300/80 text-sm">
            全国反诈中心提醒：守好钱袋子，护好幸福家
          </p>
        </div>
      </div>
    </div>
  );
}
