import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Play, Square, AlertTriangle, ShieldCheck, Wifi, WifiOff, PlugZap, ScreenShare } from 'lucide-react';
import { socket, connectSocket, disconnectSocket } from '../api';
import { useAuthStore } from '../store';
import type { DetectionResult } from '../store';
import WarningOverlay from '../components/WarningOverlay';
import toast from 'react-hot-toast';

interface ConsoleLog {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  timestamp: string;
}

interface PluginStatusPayload {
  status: 'started' | 'stopped' | 'error';
  message?: string;
}

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

export default function UserConsole() {
  const { token } = useAuthStore();
  const [monitoring, setMonitoring] = useState(persistedMonitoring);
  const [connected, setConnected] = useState(false);
  const [pluginReady, setPluginReady] = useState(false);
  const [screenGranted, setScreenGranted] = useState(persistedScreenGranted);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningData, setWarningData] = useState<any>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(persistedLiveStream);
  const logIdRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 关键环境变量:
  // VITE_EXTENSION_ID: Chrome 插件 ID（可选，开发阶段可不填）
  // VITE_GATEWAY_WS_URL: 网关 WebSocket 地址，默认使用当前站点 origin
  const extensionId = import.meta.env.VITE_EXTENSION_ID as string | undefined;
  const gatewayWsUrl = (import.meta.env.VITE_GATEWAY_WS_URL as string | undefined) || window.location.origin;

  const addLog = useCallback((type: ConsoleLog['type'], message: string) => {
    const entry: ConsoleLog = {
      id: ++logIdRef.current,
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [...prev, entry].slice(-100));
  }, []);

  // Socket connection
  useEffect(() => {
    if (!token) return;

    socket.on('connect', () => {
      setConnected(true);
      addLog('success', 'Socket 连接成功');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      addLog('error', 'Socket 连接断开');
    });

    socket.on('DETECTION_RESULT', (data: DetectionResult) => {
      setResult(data);
      if (data.is_fraud) {
        addLog('warning', `检测到可疑信息 - 风险评分: ${data.risk_score}, 类型: ${data.fraud_type_label}`);
      } else {
        addLog('info', `检测完成 - 安全, 风险评分: ${data.risk_score}`);
      }
    });

    socket.on('SHOW_WARNING', (data: any) => {
      setWarningData(data);
      setWarningVisible(true);
      addLog('error', `高危预警: ${data.fraud_type_label || '未知诈骗类型'}`);
    });

    socket.on('DETECTION_ERROR', (data: { error?: string }) => {
      addLog('error', `检测异常: ${data?.error || '未知错误'}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('DETECTION_RESULT');
      socket.off('SHOW_WARNING');
      socket.off('DETECTION_ERROR');
    };
  }, [token, addLog]);

  useEffect(() => {
    const onWindowMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;

      if (payload.type === 'AF_PLUGIN_READY') {
        setPluginReady(true);
        addLog('success', '浏览器插件已就绪');
      }

      if (payload.type === 'AF_PLUGIN_STATUS') {
        const statusPayload = payload.payload as PluginStatusPayload;
        if (!statusPayload) return;

        if (statusPayload.status === 'started') {
          addLog('success', statusPayload.message || '插件监控已启动');
        } else if (statusPayload.status === 'stopped') {
          addLog('info', statusPayload.message || '插件监控已停止');
        } else {
          addLog('error', statusPayload.message || '插件发生错误');
        }
      }

      if (payload.type === 'AF_PLUGIN_DATA') {
        const text = payload.payload?.text;
        if (typeof text === 'string' && text.trim()) {
          addLog('info', `插件捕获文本: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`);
        }
      }
    };

    window.addEventListener('message', onWindowMessage);
    window.postMessage({ type: 'AF_PING_PLUGIN' }, window.location.origin);

    return () => {
      window.removeEventListener('message', onWindowMessage);
    };
  }, [addLog]);

  // Auto scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = liveStream;
    }
  }, [liveStream]);

  const askExtensionToStart = useCallback((jwt: string) => {
    const command = {
      type: 'AF_START_MONITORING',
      payload: {
        token: jwt,
        gatewayWsUrl,
      },
    };

    window.postMessage(command, window.location.origin);

    if (extensionId && window.chrome?.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage(extensionId, command, () => {
        // ignore callback errors during local development
      });
    }
  }, [extensionId, gatewayWsUrl]);

  const askExtensionToStop = useCallback(() => {
    const command = { type: 'AF_STOP_MONITORING' };
    window.postMessage(command, window.location.origin);

    if (extensionId && window.chrome?.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage(extensionId, command, () => {
        // ignore callback errors during local development
      });
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
      addLog('success', '监控已启动，正在接收插件多模态数据流');
    } catch {
      setScreenGranted(false);
      persistedScreenGranted = false;
      toast.error('未授予屏幕录制权限，无法启动监控');
      addLog('error', '屏幕授权失败，监控未启动');
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
    addLog('info', '监控已停止');
  };

  useEffect(() => {
    return () => {
      // 切换路由时保持监控会话不断开，只有显式停止时才释放资源。
      if (!persistedMonitoring) {
        persistedLiveStream?.getTracks().forEach((track) => track.stop());
        persistedLiveStream = null;
        disconnectSocket();
      }
    };
  }, []);

  const logColors: Record<string, string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  return (
    <div className="space-y-6">
      <WarningOverlay visible={warningVisible} alertData={warningData} onClose={() => setWarningVisible(false)} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary-600" /> 用户监控台
        </h1>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-sm ${connected ? 'text-green-600' : 'text-gray-400'}`}>
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connected ? '已连接' : '未连接'}
          </span>
          <button onClick={monitoring ? stopMonitoring : startMonitoring}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm ${
              monitoring ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}>
            {monitoring ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {monitoring ? '停止' : '启动'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-2">插件状态</p>
          <p className={`font-semibold flex items-center gap-2 ${pluginReady ? 'text-green-600' : 'text-amber-600'}`}>
            <PlugZap className="w-4 h-4" /> {pluginReady ? '已连接插件通道' : '未检测到插件通道'}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-2">屏幕授权</p>
          <p className={`font-semibold flex items-center gap-2 ${screenGranted ? 'text-green-600' : 'text-gray-500'}`}>
            <ScreenShare className="w-4 h-4" /> {screenGranted ? '已授权' : '未授权'}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 mb-2">网关目标</p>
          <p className="font-semibold text-gray-700 truncate">{gatewayWsUrl}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">屏幕采集预览（仅本地）</p>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full max-h-64 bg-black/90 rounded-lg object-contain"
        />
      </div>

      {/* Console output */}
      <div className="bg-gray-900 rounded-xl p-4 h-[400px] overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-gray-500">等待启动监控...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 mb-1">
              <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
              <span className={logColors[log.type] || 'text-gray-300'}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Latest result */}
      {result && (
        <div className={`rounded-xl border p-6 ${result.is_fraud ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.is_fraud
              ? <AlertTriangle className="w-6 h-6 text-red-600" />
              : <ShieldCheck className="w-6 h-6 text-green-600" />}
            <h3 className="font-semibold text-lg">
              {result.is_fraud ? '检测到可疑信息' : '信息安全'}
            </h3>
            <span className="ml-auto text-2xl font-bold">{Math.round(result.risk_score * 100)}分</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">类型: {result.fraud_type_label} | 等级: {result.risk_level}</p>
          {result.analysis && <p className="text-sm text-gray-700">{result.analysis}</p>}
        </div>
      )}
    </div>
  );
}
