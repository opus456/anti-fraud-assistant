/**
 * 实时监控页面 - 智能监控浏览内容
 * 支持：剪贴板自动检测、手动粘贴、URL检查、连续监控模式
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Radar, Shield, AlertTriangle, Clipboard, Trash2, Loader, Power, PowerOff, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuthStore } from '../store';
import type { DetectionResult } from '../store';

interface MonitorLog {
  id: number;
  content: string;
  result: DetectionResult | null;
  timestamp: Date;
  status: 'pending' | 'analyzing' | 'done' | 'error';
}

const RISK_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  safe:     { color: 'text-green-700',  bg: 'bg-green-100', label: '安全' },
  low:      { color: 'text-yellow-700', bg: 'bg-yellow-100', label: '低风险' },
  medium:   { color: 'text-orange-700', bg: 'bg-orange-100', label: '中风险' },
  high:     { color: 'text-red-700',    bg: 'bg-red-100',    label: '高风险' },
  critical: { color: 'text-red-800',    bg: 'bg-red-200',    label: '极高风险' },
};

export default function Monitor() {
  const [monitoring, setMonitoring] = useState(false);
  const [logs, setLogs] = useState<MonitorLog[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, safe: 0, risky: 0 });
  const idCounter = useRef(0);
  const lastClipboard = useRef('');
  const monitoringRef = useRef(false);
  const logsRef = useRef<MonitorLog[]>([]);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 保持 refs 同步
  useEffect(() => { monitoringRef.current = monitoring; }, [monitoring]);
  useEffect(() => { logsRef.current = logs; }, [logs]);

  // 分析内容
  const analyzeContent = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 4) return;

    // 去重：相同内容不重复检测
    if (logsRef.current.some(l => l.content === trimmed)) return;

    const id = ++idCounter.current;
    const newLog: MonitorLog = {
      id,
      content: trimmed,
      result: null,
      timestamp: new Date(),
      status: 'analyzing',
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50)); // 最多保留50条

    try {
      const endpoint = isAuthenticated ? '/detection/text' : '/detection/quick';
      const { data } = await api.post(endpoint, { content: trimmed });
      setLogs(prev => prev.map(l =>
        l.id === id ? { ...l, result: data, status: 'done' as const } : l
      ));

      // 更新统计
      setStats(prev => ({
        total: prev.total + 1,
        safe: prev.safe + (data.is_fraud ? 0 : 1),
        risky: prev.risky + (data.is_fraud ? 1 : 0),
      }));

      // 高风险弹窗
      if (data.is_fraud && data.risk_score >= 0.5) {
        toast.error(
          `🚨 检测到${data.fraud_type_label || '诈骗'}风险！(${(data.risk_score * 100).toFixed(0)}%)`,
          { duration: 8000 }
        );
      }
    } catch {
      setLogs(prev => prev.map(l =>
        l.id === id ? { ...l, status: 'error' as const } : l
      ));
    }
  }, []);

  // 剪贴板监控
  useEffect(() => {
    if (!monitoring) return;

    const checkClipboard = async () => {
      if (!monitoringRef.current) return;
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboard.current && text.trim().length >= 4) {
          lastClipboard.current = text;
          analyzeContent(text);
        }
      } catch {
        // 剪贴板权限被拒绝时静默忽略
      }
    };

    // 每2秒检查一次剪贴板
    const interval = setInterval(checkClipboard, 2000);
    toast.success('实时监控已开启 · 复制的内容将自动检测', { duration: 3000 });

    return () => {
      clearInterval(interval);
    };
  }, [monitoring, analyzeContent]);

  // 监听粘贴事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!monitoringRef.current) return;
      const text = e.clipboardData?.getData('text');
      if (text && text.trim().length >= 4) {
        analyzeContent(text);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [analyzeContent]);

  // 手动提交
  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      toast.error('请输入要检测的内容');
      return;
    }
    analyzeContent(manualInput);
    setManualInput('');
  };

  // 从剪贴板粘贴
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setManualInput(text);
        toast.success('已从剪贴板读取内容');
      } else {
        toast.error('剪贴板为空');
      }
    } catch {
      toast.error('无法访问剪贴板，请手动粘贴(Ctrl+V)');
    }
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
    setStats({ total: 0, safe: 0, risky: 0 });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 lg:pb-0">
      {/* 标题与监控开关 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Radar className={`w-7 h-7 ${monitoring ? 'text-danger-500 animate-pulse' : 'text-primary-500'}`} />
            实时监控
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {monitoring ? '监控中 · 复制的可疑内容将被自动检测' : '开启监控以自动检测复制的内容'}
          </p>
        </div>
        <button
          onClick={() => {
            setMonitoring(!monitoring);
            if (monitoring) toast('实时监控已关闭', { icon: '⏹️' });
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${
            monitoring
              ? 'bg-gray-700 hover:bg-gray-800 text-white shadow-gray-300'
              : 'bg-danger-500 hover:bg-danger-600 text-white shadow-red-200'
          }`}
        >
          {monitoring ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
          {monitoring ? '停止监控' : '开启监控'}
        </button>
      </div>

      {/* 使用说明卡片 */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-2xl p-5">
        <h3 className="font-bold text-primary-800 mb-3">📖 如何使用实时监控</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
            <div>
              <p className="font-semibold text-gray-800">开启监控</p>
              <p className="text-gray-600">点击右上角"开启监控"按钮</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
            <div>
              <p className="font-semibold text-gray-800">正常浏览</p>
              <p className="text-gray-600">浏览网页时，复制可疑内容(Ctrl+C)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <div>
              <p className="font-semibold text-gray-800">自动检测</p>
              <p className="text-gray-600">系统自动分析并弹窗预警诈骗风险</p>
            </div>
          </div>
        </div>
      </div>

      {/* 实时统计 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-primary-600">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">已检测</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.safe}</p>
          <p className="text-xs text-gray-500 mt-1">安全</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-red-600">{stats.risky}</p>
          <p className="text-xs text-gray-500 mt-1">有风险</p>
        </div>
      </div>

      {/* 快速输入区 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-gray-800">快速检测</h3>
          <span className="text-xs text-gray-400">粘贴或输入可疑内容即时分析</span>
        </div>
        <div className="flex gap-3">
          <textarea
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="粘贴可疑短信、聊天记录、邮件内容、网页文字..."
            className="flex-1 h-24 resize-none border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleManualSubmit(); }}
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handlePasteFromClipboard}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              title="从剪贴板粘贴"
            >
              <Clipboard className="w-4 h-4" />
              粘贴
            </button>
            <button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-danger-500 hover:bg-danger-600 text-white rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Radar className="w-4 h-4" />
              检测
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">提示：Ctrl+V 粘贴内容 · Ctrl+Enter 快速提交</p>
      </div>

      {/* 监控日志 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            检测日志 ({logs.length})
          </h3>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Radar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              {monitoring ? '等待检测内容...\n复制可疑文字即可自动分析' : '开启监控或手动输入内容开始检测'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {logs.map((log) => {
              const badge = log.result ? RISK_BADGE[log.result.risk_level] || RISK_BADGE.safe : null;
              const isExpanded = expandedId === log.id;

              return (
                <div key={log.id} className={`transition-colors ${log.result?.is_fraud ? 'bg-red-50/50' : ''}`}>
                  {/* 摘要行 */}
                  <div
                    className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    {/* 状态图标 */}
                    <div className="flex-shrink-0">
                      {log.status === 'analyzing' && (
                        <Loader className="w-5 h-5 text-primary-500 animate-spin" />
                      )}
                      {log.status === 'done' && log.result?.is_fraud && (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      {log.status === 'done' && !log.result?.is_fraud && (
                        <Shield className="w-5 h-5 text-green-500" />
                      )}
                      {log.status === 'error' && (
                        <AlertTriangle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* 内容预览 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{log.content}</p>
                      <p className="text-xs text-gray-400">
                        {log.timestamp.toLocaleTimeString()}
                        {log.result && ` · ${log.result.response_time_ms}ms`}
                      </p>
                    </div>

                    {/* 风险标签 */}
                    {badge && (
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
                        {badge.label}
                        {log.result && ` ${(log.result.risk_score * 100).toFixed(0)}%`}
                      </span>
                    )}

                    {log.status === 'analyzing' && (
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        分析中...
                      </span>
                    )}

                    {log.status === 'done' && (
                      isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && log.result && (
                    <div className="px-5 pb-4 space-y-3 animate-slide-down">
                      {/* 诈骗类型 */}
                      {log.result.fraud_type_label && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">诈骗类型:</span>
                          <span className="text-xs font-semibold text-red-600">{log.result.fraud_type_label}</span>
                        </div>
                      )}

                      {/* 分析 */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600 mb-1">📋 分析报告</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{log.result.analysis}</p>
                      </div>

                      {/* 预警 */}
                      {log.result.warning_scripts.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                          <p className="text-xs font-medium text-red-600 mb-1">🚨 安全警告</p>
                          {log.result.warning_scripts.map((s, i) => (
                            <p key={i} className="text-sm text-red-700">{s}</p>
                          ))}
                        </div>
                      )}

                      {/* 建议 */}
                      {log.result.suggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">🛡️ 防御建议</p>
                          <ul className="space-y-1">
                            {log.result.suggestions.slice(0, 4).map((s, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-primary-500">•</span>{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 匹配案例 */}
                      {log.result.matched_cases.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">📚 相似案例</p>
                          {log.result.matched_cases.slice(0, 2).map((c, i) => (
                            <div key={i} className="bg-gray-50 rounded p-2 mb-1">
                              <p className="text-xs font-medium text-gray-700">{c.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{c.content.slice(0, 120)}...</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
