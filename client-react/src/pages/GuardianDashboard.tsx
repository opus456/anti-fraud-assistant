import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Bell, Users, AlertTriangle, CheckCircle, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import api from '../api';
import { socket, connectSocket, disconnectSocket } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

interface Charge {
  relation_id: number;
  user_id: number;
  username: string;
  nickname: string;
  risk_score: number;
  total_detections: number;
  fraud_hits: number;
}

interface GuardianAlert {
  id: number;
  charge_username: string;
  risk_level: number;
  fraud_type_label: string;
  message: string;
  reason?: string;
  screenshot?: string;
  created_at: string;
  resolved: boolean;
}

interface GuardianDetection {
  id: number;
  user_id: number;
  username: string;
  nickname: string;
  input_content: string;
  is_fraud: boolean;
  risk_level: string;
  risk_score: number;
  fraud_type: string;
  created_at: string;
}

interface AlertApiItem {
  id: number;
  user_id: number;
  risk_level: number;
  fraud_type?: string;
  title: string;
  description: string;
  created_at: string;
  is_resolved: boolean;
}

function normalizeRiskLevel(value: unknown): number {
  if (typeof value === 'number') return value;
  const map: Record<string, number> = {
    safe: 0,
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };
  if (typeof value === 'string') {
    return map[value] ?? 3;
  }
  return 3;
}

export default function GuardianDashboard() {
  const { token } = useAuthStore();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const [alertMode, setAlertMode] = useState(false);
  const [detections, setDetections] = useState<GuardianDetection[]>([]);
  const [loadingDetections, setLoadingDetections] = useState(false);

  const fetchCharges = async () => {
    try {
      const { data } = await api.get('/guardians/charges');
      setCharges(data.charges || data || []);
    } catch (err: any) {
      toast.error(err.message || '获取监护列表失败');
    }
  };

  const handleResolve = async (alertId: number) => {
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, resolved: true } : a));
      toast.success('已标记为已处理');
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const fetchDetections = async () => {
    setLoadingDetections(true);
    try {
      const { data } = await api.get('/guardians/detections', {
        params: { page: 1, page_size: 100 },
      });
      setDetections(data.items || data || []);
    } catch (err: any) {
      toast.error(err.message || '获取检测记录失败');
    } finally {
      setLoadingDetections(false);
    }
  };

  const fetchPendingAlerts = async () => {
    try {
      const { data } = await api.get('/alerts/', {
        params: { is_resolved: false, page: 1, page_size: 100 },
      });

      const list: AlertApiItem[] = Array.isArray(data) ? data : [];
      const mapped: GuardianAlert[] = list.map((item) => ({
        id: item.id,
        charge_username: item.user_id ? `用户#${item.user_id}` : '被监护用户',
        risk_level: normalizeRiskLevel(item.risk_level),
        fraud_type_label: item.fraud_type || '未知',
        message: item.title || item.description || '检测到可疑行为',
        reason: item.description || '',
        screenshot: '',
        created_at: item.created_at,
        resolved: item.is_resolved,
      }));

      setAlerts(mapped);
      setAlertMode(mapped.some((a) => !a.resolved && a.risk_level >= 2));
    } catch (err: any) {
      toast.error(err.message || '获取待处理预警失败');
    }
  };

  const onGuardianAlert = useCallback((data: any) => {
    const normalizedRiskLevel = normalizeRiskLevel(data.risk_level ?? data.risk_level_label);
    const newAlert: GuardianAlert = {
      id: Date.now(),
      charge_username: data.username || (data.user_id ? `用户#${data.user_id}` : '未知'),
      risk_level: normalizedRiskLevel,
      fraud_type_label: data.fraud_type_label || '未知',
      message: data.message || data.reason || '检测到可疑行为',
      reason: data.reason || data.analysis || '',
      screenshot: data.screenshot || data.image_frame || data.image || '',
      created_at: new Date().toISOString(),
      resolved: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setAlertMode(true);
    fetchPendingAlerts();
    toast.error(`紧急预警: ${newAlert.charge_username} 可能遭遇诈骗！`);
  }, []);

  useEffect(() => {
    fetchCharges();
    fetchDetections();
    fetchPendingAlerts();
  }, []);

  useEffect(() => {
    if (!token) return;
    connectSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('GUARDIAN_ALERT', onGuardianAlert);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('GUARDIAN_ALERT');
      disconnectSocket();
    };
  }, [token, onGuardianAlert]);

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const latestHighRiskAlert = unresolvedAlerts.find((a) => a.risk_level >= 2) || unresolvedAlerts[0] || null;

  const riskBadge = (level: number) => {
    const map: Record<number, string> = {
      0: 'bg-green-100 text-green-700',
      1: 'bg-blue-100 text-blue-700',
      2: 'bg-amber-100 text-amber-700',
      3: 'bg-red-100 text-red-700',
    };
    const labels: Record<number, string> = { 0: '安全', 1: '低风险', 2: '中风险', 3: '高风险' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[level] || map[3]}`}>
        {labels[level] || '高风险'}
      </span>
    );
  };

  return (
    <div className={`min-h-screen transition-colors ${alertMode ? 'bg-red-50' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-6 ${alertMode ? 'bg-red-600' : 'bg-primary-800'} text-white`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100">
              <ArrowLeft className="w-4 h-4" /> 返回首页
            </Link>
            <span className={`flex items-center gap-1 text-sm ${connected ? 'text-green-300' : 'text-gray-300'}`}>
              {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {connected ? '实时连接' : '未连接'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">监护人面板</h1>
              <p className="text-sm opacity-80">实时监护您的家人安全</p>
            </div>
          </div>
          {alertMode && (
            <div className="mt-4 bg-red-700 rounded-lg p-3 flex items-center gap-2 animate-pulse">
              <Bell className="w-5 h-5" />
              <span className="font-medium">紧急警报！您的被监护人可能正在遭受诈骗。</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {latestHighRiskAlert && (
          <div className="bg-white rounded-xl border-2 border-red-300 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-red-700 mb-4">安全监测报告</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">被监护人: <span className="font-medium text-gray-900">{latestHighRiskAlert.charge_username}</span></p>
                <p className="text-sm text-gray-600">风险类型: <span className="font-medium text-gray-900">{latestHighRiskAlert.fraud_type_label}</span></p>
                <p className="text-sm text-gray-600">风险等级: {riskBadge(latestHighRiskAlert.risk_level)}</p>
                <p className="text-sm text-gray-600">触发时间: {new Date(latestHighRiskAlert.created_at).toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-3">模型原因说明:</p>
                <p className="text-sm text-gray-800 leading-relaxed bg-red-50 border border-red-100 rounded-lg p-3">
                  {latestHighRiskAlert.reason || latestHighRiskAlert.message}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">现场截图</p>
                {latestHighRiskAlert.screenshot ? (
                  <img
                    src={latestHighRiskAlert.screenshot}
                    alt="现场截图"
                    className="w-full h-56 object-cover rounded-lg border border-red-200"
                  />
                ) : (
                  <div className="w-full h-56 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400">
                    暂无截图数据
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charges */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-600" /> 被监护人列表 ({charges.length})
          </h2>
          {charges.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">暂无被监护人</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {charges.map((c) => (
                <div key={c.relation_id || c.user_id} className="border rounded-lg p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">
                    {(c.nickname || c.username)?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{c.nickname || c.username}</p>
                    <p className="text-xs text-gray-500">
                      检测 {c.total_detections} 次 | 命中 {c.fraud_hits} 次 | 风险 {c.risk_score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unresolved alerts */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" /> 待处理预警 ({unresolvedAlerts.length})
          </h2>
          {unresolvedAlerts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">暂无待处理预警</p>
          ) : (
            <div className="space-y-3">
              {unresolvedAlerts.map((alert) => (
                <div key={alert.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{alert.charge_username}</span>
                      {riskBadge(alert.risk_level)}
                      <span className="text-xs text-gray-500">{alert.fraud_type_label}</span>
                    </div>
                    <button onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> 已处理
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary-600" /> 全部检测记录 ({detections.length})
          </h2>

          {loadingDetections ? (
            <p className="text-gray-400 text-sm text-center py-4">加载中...</p>
          ) : detections.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">暂无检测记录</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">用户</th>
                    <th className="py-2 pr-3">内容</th>
                    <th className="py-2 pr-3">结果</th>
                    <th className="py-2 pr-3">风险</th>
                    <th className="py-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3">{item.nickname || item.username}</td>
                      <td className="py-2 pr-3 max-w-[320px] truncate">{item.input_content}</td>
                      <td className="py-2 pr-3">
                        {item.is_fraud ? (
                          <span className="text-red-600 font-medium">疑似诈骗</span>
                        ) : (
                          <span className="text-green-600 font-medium">安全</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {Math.round((item.risk_score || 0) * 100)} / {item.risk_level || 'safe'}
                      </td>
                      <td className="py-2 text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
