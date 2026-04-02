import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, AlertTriangle, ShieldCheck, Wifi, WifiOff, PlugZap, ScreenShare, 
         Shield, CheckCircle2, XCircle, Clock, TrendingUp, Zap, MessageSquare } from 'lucide-react';
import { socket, connectSocket, disconnectSocket } from '../api';
import { useAuthStore } from '../store';
import type { DetectionResult } from '../store';
import WarningOverlay from '../components/WarningOverlay';
import toast from 'react-hot-toast';

let persistedMonitoring = false;
let persistedScreenGranted = false;
let persistedLiveStream: MediaStream | null = null;

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (extensionId: string, message: unknown, cb?: (response: any) => void) => void;
      };
    };
  }
}

interface DetectionLog {
  id: string;
  timestamp: Date;
  result: DetectionResult;
}

export default function UserConsole() {
  const { token } = useAuthStore();
  const [monitoring, setMonitoring] = useState(persistedMonitoring);
  const [connected, setConnected] = useState(false);
  const [pluginReady, setPluginReady] = useState(false);
  const [screenGranted, setScreenGranted] = useState(persistedScreenGranted);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningData, setWarningData] = useState<any>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(persistedLiveStream);
  const [detectionLogs, setDetectionLogs] = useState<DetectionLog[]>([]);
  const [stats, setStats] = useState({ total: 0, safe: 0, warning: 0, danger: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const extensionId = import.meta.env.VITE_EXTENSION_ID as string | undefined;
  const gatewayWsUrl = (import.meta.env.VITE_GATEWAY_WS_URL as string | undefined) || window.location.origin;

  // Socket connection
  useEffect(() => {
    if (!token) return;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('DETECTION_RESULT', (data: DetectionResult) => {
      setResult(data);
      // 添加到检测日志
      const newLog: DetectionLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        result: data,
      };
      setDetectionLogs(prev => [newLog, ...prev].slice(0, 50)); // 保留最近50条
      
      // 更新统计
      setStats(prev => {
        const newStats = { ...prev, total: prev.total + 1 };
        if (data.risk_score >= 0.7) {
          newStats.danger = prev.danger + 1;
        } else if (data.risk_score >= 0.4) {
          newStats.warning = prev.warning + 1;
        } else {
          newStats.safe = prev.safe + 1;
        }
        return newStats;
      });

      // 根据风险等级显示不同的提示
      if (data.is_fraud) {
        toast.error(`🚨 检测到风险: ${data.fraud_type_label}`, { duration: 4000 });
      } else if (data.risk_score >= 0.4) {
        toast(`⚠️ 发现可疑内容，请注意`, { icon: '⚠️', duration: 3000 });
      } else {
        toast.success('✅ 内容安全', { duration: 2000 });
      }
    });

    socket.on('SHOW_WARNING', (data: any) => {
      setWarningData(data);
      setWarningVisible(true);
    });

    socket.on('DETECTION_ERROR', () => {});

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('DETECTION_RESULT');
      socket.off('SHOW_WARNING');
      socket.off('DETECTION_ERROR');
    };
  }, [token]);

  useEffect(() => {
    const onWindowMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'AF_PLUGIN_READY') {
        setPluginReady(true);
      }
    };
    window.addEventListener('message', onWindowMessage);
    window.postMessage({ type: 'AF_PING_PLUGIN' }, window.location.origin);
    return () => {
      window.removeEventListener('message', onWindowMessage);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = liveStream;
    }
  }, [liveStream]);

  const askExtensionToStart = useCallback((jwt: string) => {
    const command = {
      type: 'AF_START_MONITORING',
      payload: { token: jwt, gatewayWsUrl },
    };
    window.postMessage(command, window.location.origin);
    if (extensionId && window.chrome?.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage(extensionId, command, () => {});
    }
  }, [extensionId, gatewayWsUrl]);

  const askExtensionToStop = useCallback(() => {
    const command = { type: 'AF_STOP_MONITORING' };
    window.postMessage(command, window.location.origin);
    if (extensionId && window.chrome?.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage(extensionId, command, () => {});
    }
  }, [extensionId]);

  const startMonitoring = async () => {
    if (!token) {
      toast.error('请先登录');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      });
      setLiveStream(stream);
      persistedLiveStream = stream;
      setScreenGranted(true);
      persistedScreenGranted = true;
      connectSocket(token);
      askExtensionToStart(token);
      setMonitoring(true);
      persistedMonitoring = true;
      toast.success('🛡️ 实时监控已启动');
    } catch {
      setScreenGranted(false);
      persistedScreenGranted = false;
      toast.error('未授予屏幕录制权限');
    }
  };

  const stopMonitoring = () => {
    setMonitoring(false);
    persistedMonitoring = false;
    askExtensionToStop();
    disconnectSocket();
    liveStream?.getTracks().forEach((track) => track.stop());
    setLiveStream(null);
    persistedLiveStream = null;
    setScreenGranted(false);
    persistedScreenGranted = false;
    toast('监控已停止', { icon: '⏹️' });
  };

  useEffect(() => {
    return () => {
      if (!persistedMonitoring) {
        persistedLiveStream?.getTracks().forEach((track) => track.stop());
        persistedLiveStream = null;
        disconnectSocket();
      }
    };
  }, []);

  const getRiskColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600';
    if (score >= 0.4) return 'text-amber-600';
    return 'text-green-600';
  };

  const getRiskBg = (score: number) => {
    if (score >= 0.7) return 'bg-red-50 border-red-200';
    if (score >= 0.4) return 'bg-amber-50 border-amber-200';
    return 'bg-green-50 border-green-200';
  };

  const getRiskGradient = (score: number) => {
    if (score >= 0.7) return 'from-red-500 via-red-600 to-red-700';
    if (score >= 0.4) return 'from-amber-400 via-amber-500 to-amber-600';
    return 'from-emerald-400 via-emerald-500 to-emerald-600';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <WarningOverlay visible={warningVisible} alertData={warningData} onClose={() => setWarningVisible(false)} />

      {/* ========== 顶部醒目的实时检测结果区 ========== */}
      {result && result.is_fraud && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-1 animate-pulse-glow shadow-2xl shadow-red-500/50">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" />
          <div className="relative bg-gradient-to-br from-red-900/95 to-red-950/95 rounded-[22px] p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* 警告图标 */}
              <div className="relative">
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center animate-bounce-slow shadow-2xl shadow-red-500/50">
                  <AlertTriangle className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center animate-ping">
                  <span className="text-red-600 font-black text-sm">!</span>
                </div>
              </div>
              
              {/* 警告内容 */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <span className="px-4 py-1.5 bg-red-500/30 border border-red-400/50 rounded-full text-red-200 text-sm font-semibold animate-pulse">
                    ⚠️ 检测到风险
                  </span>
                  <span className="text-red-300 text-sm">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                  {result.fraud_type_label}
                </h2>
                <p className="text-red-200 text-lg max-w-2xl">
                  {result.analysis || '检测到可疑诈骗内容，请立即停止操作并核实信息来源'}
                </p>
              </div>
              
              {/* 风险分数 */}
              <div className="flex flex-col items-center">
                <div className="text-6xl lg:text-7xl font-black text-white drop-shadow-lg">
                  {Math.round(result.risk_score * 100)}
                </div>
                <div className="text-red-300 text-sm font-medium -mt-1">风险指数</div>
                <div className="mt-3 px-4 py-1.5 bg-red-500 rounded-full text-white text-sm font-bold animate-pulse">
                  {result.risk_level || '高风险'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== 安全状态（当没有风险时显示） ========== */}
      {result && !result.is_fraud && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-1 shadow-xl shadow-green-500/30">
          <div className="relative bg-gradient-to-br from-emerald-900/95 to-green-950/95 rounded-[22px] p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-white">当前内容安全</h2>
                  <span className="px-3 py-1 bg-green-500/30 border border-green-400/50 rounded-full text-green-200 text-sm font-medium">
                    ✓ 已验证
                  </span>
                </div>
                <p className="text-green-200">{result.analysis || '未检测到风险内容，请继续保持警惕'}</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-black text-white">{Math.round(result.risk_score * 100)}</div>
                <div className="text-green-300 text-sm">安全分数</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== 控制区和状态 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主控制面板 */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700/50">
          <div className="flex flex-col items-center text-center">
            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-500
                          ${monitoring 
                            ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/50 animate-pulse-safe' 
                            : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-xl'}`}>
              <Shield className="w-16 h-16 text-white" />
              {monitoring && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-green-400/50 animate-ping" />
                  <div className="absolute -inset-2 rounded-full border-2 border-green-300/30 animate-pulse" />
                </>
              )}
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">
              {monitoring ? '正在监控中' : '监控已停止'}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              {monitoring ? '实时分析屏幕内容，守护您的安全' : '启动监控以检测可疑内容'}
            </p>
            
            <button 
              onClick={monitoring ? stopMonitoring : startMonitoring}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                        ${monitoring 
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30'}`}
            >
              {monitoring ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              {monitoring ? '停止监控' : '启动监控'}
            </button>
          </div>
          
          {/* 状态指示器 */}
          <div className="mt-6 space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${connected ? 'bg-green-500/10 border border-green-500/30' : 'bg-slate-700/50 border border-slate-600/30'}`}>
              <div className="flex items-center gap-3">
                {connected ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-slate-500" />}
                <span className={connected ? 'text-green-300' : 'text-slate-400'}>服务连接</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${connected ? 'bg-green-500/20 text-green-300' : 'bg-slate-600 text-slate-400'}`}>
                {connected ? '在线' : '离线'}
              </span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${pluginReady ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-slate-700/50 border border-slate-600/30'}`}>
              <div className="flex items-center gap-3">
                <PlugZap className={`w-5 h-5 ${pluginReady ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className={pluginReady ? 'text-blue-300' : 'text-slate-400'}>浏览器插件</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pluginReady ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-600 text-slate-400'}`}>
                {pluginReady ? '就绪' : '未检测'}
              </span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${screenGranted ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-slate-700/50 border border-slate-600/30'}`}>
              <div className="flex items-center gap-3">
                <ScreenShare className={`w-5 h-5 ${screenGranted ? 'text-purple-400' : 'text-slate-500'}`} />
                <span className={screenGranted ? 'text-purple-300' : 'text-slate-400'}>屏幕权限</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${screenGranted ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-600 text-slate-400'}`}>
                {screenGranted ? '已授权' : '未授权'}
              </span>
            </div>
          </div>
        </div>

        {/* 统计数据 */}
        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg hover:shadow-xl transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
              <span className="text-xs text-slate-400">今日</span>
            </div>
            <p className="text-4xl font-black text-slate-800 mb-1">{stats.total}</p>
            <p className="text-sm text-slate-500">总检测次数</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/80 p-5 shadow-lg hover:shadow-xl transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-green-500/30">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-green-600">安全</span>
            </div>
            <p className="text-4xl font-black text-green-700 mb-1">{stats.safe}</p>
            <p className="text-sm text-green-600">安全通过</p>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 p-5 shadow-lg hover:shadow-xl transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/30">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-amber-600">警告</span>
            </div>
            <p className="text-4xl font-black text-amber-700 mb-1">{stats.warning}</p>
            <p className="text-sm text-amber-600">低风险提醒</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200/80 p-5 shadow-lg hover:shadow-xl transition-shadow group relative overflow-hidden">
            {stats.danger > 0 && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
            <div className="flex items-center justify-between mb-3 relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-red-600">危险</span>
            </div>
            <p className="text-4xl font-black text-red-700 mb-1 relative">{stats.danger}</p>
            <p className="text-sm text-red-600 relative">高危拦截</p>
          </div>
        </div>
      </div>

      {/* ========== 屏幕预览和消息流 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 屏幕预览 */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                <ScreenShare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">屏幕采集预览</h3>
                <p className="text-xs text-slate-400">实时捕获内容分析</p>
              </div>
            </div>
            {monitoring && (
              <span className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-4 py-2 rounded-full border border-green-200">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                实时采集中
              </span>
            )}
          </div>
          <div className="p-4 bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-black rounded-2xl object-contain"
            />
          </div>
        </div>

        {/* 检测消息流 */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-lg flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">检测消息流</h3>
                <p className="text-xs text-slate-400">最近 {detectionLogs.length} 条记录</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {detectionLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">{monitoring ? '等待检测结果...' : '暂无检测记录'}</p>
                <p className="text-sm mt-1">启动监控后将显示实时检测结果</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {detectionLogs.map((log, index) => (
                  <div 
                    key={log.id} 
                    className={`px-5 py-4 hover:bg-slate-50 transition-all ${index === 0 ? 'animate-slide-down' : ''} ${getRiskBg(log.result.risk_score)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md
                                    bg-gradient-to-br ${getRiskGradient(log.result.risk_score)}`}>
                        {log.result.is_fraud ? (
                          <AlertTriangle className="w-5 h-5 text-white" />
                        ) : (
                          <ShieldCheck className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold ${getRiskColor(log.result.risk_score)}`}>
                            {log.result.is_fraud ? log.result.fraud_type_label : '内容安全'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-bold
                                          ${log.result.risk_score >= 0.7 ? 'bg-red-500 text-white' : 
                                            log.result.risk_score >= 0.4 ? 'bg-amber-500 text-white' : 
                                            'bg-green-500 text-white'}`}>
                            {Math.round(log.result.risk_score * 100)}%
                          </span>
                        </div>
                        {log.result.analysis && (
                          <p className="text-sm text-slate-600 line-clamp-2">{log.result.analysis}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {log.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
