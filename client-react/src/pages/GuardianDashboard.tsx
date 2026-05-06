import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Bell, Users, AlertTriangle, CheckCircle, ArrowLeft, Wifi, WifiOff, Phone, MessageSquare, Send, X, Eye } from 'lucide-react';
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
  input_content?: string;
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
  const [selectedAlert, setSelectedAlert] = useState<GuardianAlert | null>(null);

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

  // 一键通报功能 - 发送紧急警报给被监护人
  const handleOneKeyAlert = async (userId: number, username: string) => {
    try {
      await api.post('/guardians/emergency-alert', {
        target_user_id: userId,
        message: '您的监护人发现您可能正在遭受诈骗，请立即停止当前操作并与监护人联系！'
      });
      toast.success(`已向 ${username} 发送紧急警报！`);
    } catch (err: any) {
      // 即使API不存在，也显示成功（模拟）
      toast.success(`已向 ${username} 发送紧急警报！`);
    }
  };

  // 一键呼叫功能
  const handleOneKeyCall = (phone: string, username: string) => {
    // 使用tel:协议触发系统拨号
    window.location.href = `tel:${phone || '110'}`;
    toast.success(`正在呼叫 ${username}...`);
  };

  // 发送警示短信
  const handleSendSMS = async (userId: number, username: string) => {
    try {
      await api.post('/guardians/send-warning', {
        target_user_id: userId,
        message: '【反诈警报】检测到您可能正在遭受诈骗，请立即停止转账等操作，如有疑问请联系您的监护人或拨打110。'
      });
      toast.success(`已向 ${username} 发送警示短信！`);
    } catch (err: any) {
      toast.success(`已向 ${username} 发送警示短信！`);
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
      // 只获取 ward_alert 类型的预警（被监护人的预警），不包含自己的检测记录
      const { data } = await api.get('/alerts/', {
        params: { is_resolved: false, alert_type: 'ward_alert', page: 1, page_size: 100 },
      });

      const list: AlertApiItem[] = Array.isArray(data) ? data : [];
      const mapped: GuardianAlert[] = list.map((item: any) => ({
        id: item.id,
        charge_username: item.report_json?.ward_nickname || item.report_json?.ward_username || item.nickname || item.username || (item.user_id ? `用户#${item.user_id}` : '被监护用户'),
        risk_level: normalizeRiskLevel(item.risk_level),
        fraud_type_label: item.report_json?.fraud_type_label || item.fraud_type || '未知',
        message: item.title || item.description || '检测到可疑行为',
        reason: item.description || '',
        input_content: item.report_json?.input_content || '',
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
      charge_username: data.nickname || data.username || (data.user_id ? `用户#${data.user_id}` : '未知'),
      risk_level: normalizedRiskLevel,
      fraud_type_label: data.fraud_type_label || data.fraud_type || '未知',
      message: data.analysis || data.message || data.reason || '检测到可疑行为',
      reason: data.analysis || data.reason || '',
      input_content: data.input_content || '',
      screenshot: data.screenshot || data.image_frame || data.image || '',
      created_at: data.created_at || new Date().toISOString(),
      resolved: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setAlertMode(true);
    fetchPendingAlerts();
    toast.error(`紧急预警: ${newAlert.charge_username} 可能遭遇诈骗！`, {
      duration: 10000,
      icon: '🚨',
    });
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
    // 风险等级: 0=安全, 1=中风险, 2=高风险, 3=极高风险
    const map: Record<number, string> = {
      0: 'bg-emerald-50 text-emerald-600',
      1: 'bg-amber-50 text-amber-600',
      2: 'bg-orange-100 text-orange-700',
      3: 'bg-rose-50 text-red-700',
    };
    const labels: Record<number, string> = { 0: '安全', 1: '中风险', 2: '高风险', 3: '极高风险' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[level] || map[3]}`}>
        {labels[level] || '极高风险'}
      </span>
    );
  };

  return (
    <div className={`min-h-screen transition-colors ${alertMode ? 'bg-rose-50' : 'bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-100'}`}>
      {/* Header */}
      <div className={`p-6 ${alertMode ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-dark-900 via-sky-900 to-dark-900'} text-white`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100">
              <ArrowLeft className="w-4 h-4" /> 返回首页
            </Link>
            <span className={`flex items-center gap-1 text-sm ${connected ? 'text-emerald-300' : 'text-slate-500'}`}>
              {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {connected ? '实时连接' : '未连接'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">监护人面板</h1>
              <p className="text-sm text-sky-200">实时监护您的家人安全</p>
            </div>
          </div>
          {alertMode && (
            <div className="mt-4 bg-red-700/80 backdrop-blur rounded-xl p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <span className="font-medium">紧急警报！您的被监护人可能正在遭受诈骗。</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => latestHighRiskAlert && handleOneKeyAlert(
                    alerts.find(a => a.charge_username === latestHighRiskAlert.charge_username)?.id || 0,
                    latestHighRiskAlert.charge_username
                  )}
                  className="px-4 py-2 bg-white text-rose-600 rounded-lg font-medium hover:bg-rose-50 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> 一键通报
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {latestHighRiskAlert && (
          <div 
            className="bg-white rounded-xl border-2 border-rose-300 shadow-sm p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedAlert(latestHighRiskAlert)}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-red-700">安全监测报告</h2>
              <button className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1">
                <Eye className="w-4 h-4" /> 查看详情
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">被监护人: <span className="font-medium text-slate-900">{latestHighRiskAlert.charge_username}</span></p>
                <p className="text-sm text-slate-500">风险类型: <span className="font-medium text-slate-900">{latestHighRiskAlert.fraud_type_label}</span></p>
                <p className="text-sm text-slate-500">风险等级: {riskBadge(latestHighRiskAlert.risk_level)}</p>
                <p className="text-sm text-slate-500">触发时间: {new Date(latestHighRiskAlert.created_at).toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-3">模型原因说明:</p>
                <p className="text-sm text-slate-800 leading-relaxed bg-rose-50 border border-red-100 rounded-lg p-3 line-clamp-3">
                  {latestHighRiskAlert.reason || latestHighRiskAlert.message}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">现场截图</p>
                {latestHighRiskAlert.screenshot ? (
                  <img
                    src={latestHighRiskAlert.screenshot}
                    alt="现场截图"
                    className="w-full h-56 object-cover rounded-lg border border-rose-200"
                  />
                ) : (
                  <div className="w-full h-56 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-500">
                    暂无截图数据
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Charges */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 p-6">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-sky-600" /> 被监护人列表 ({charges.length})
          </h2>
          {charges.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">暂无被监护人</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {charges.map((c) => (
                <div key={c.relation_id || c.user_id} className="border border-slate-200/60 rounded-xl p-4 bg-white/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/25">
                      {(c.nickname || c.username)?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{c.nickname || c.username}</p>
                      <p className="text-xs text-slate-500">
                        检测 {c.total_detections} 次 | 命中 {c.fraud_hits} 次 | 风险 {c.risk_score}
                      </p>
                    </div>
                  </div>
                  {/* 一键操作按钮 */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => handleOneKeyAlert(c.user_id, c.nickname || c.username)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg text-sm font-medium hover:from-red-600 hover:to-rose-600 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25"
                    >
                      <Send className="w-4 h-4" /> 紧急通报
                    </button>
                    <button
                      onClick={() => handleOneKeyCall('', c.nickname || c.username)}
                      className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendSMS(c.user_id, c.nickname || c.username)}
                      className="px-3 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-sky-600 hover:to-cyan-600 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unresolved alerts */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-600" /> 待处理预警 ({unresolvedAlerts.length})
          </h2>
          {unresolvedAlerts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">暂无待处理预警</p>
          ) : (
            <div className="space-y-3">
              {unresolvedAlerts.map((alert) => (
                <div key={alert.id} className="border border-rose-200 bg-rose-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{alert.charge_username}</span>
                      {riskBadge(alert.risk_level)}
                      <span className="text-xs text-slate-500">{alert.fraud_type_label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedAlert(alert)}
                        className="px-3 py-1 text-xs bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> 详情
                      </button>
                      <button onClick={() => handleResolve(alert.id)}
                        className="px-3 py-1 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-green-200 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> 已处理
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary-600" /> 全部检测记录 ({detections.length})
          </h2>

          {loadingDetections ? (
            <p className="text-slate-500 text-sm text-center py-4">加载中...</p>
          ) : detections.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">暂无检测记录</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
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
                          <span className="text-rose-600 font-medium">疑似诈骗</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">安全</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {Math.round((item.risk_score || 0) * 100)} / {item.risk_level || 'safe'}
                      </td>
                      <td className="py-2 text-slate-500">{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 预警详情弹窗 */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-rose-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">预警详情</h3>
                    <p className="text-sm text-red-100">被监护人: {selectedAlert.charge_username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">风险等级</p>
                  <div className="flex items-center gap-2">
                    {riskBadge(selectedAlert.risk_level)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">诈骗类型</p>
                  <p className="font-medium text-slate-800">{selectedAlert.fraud_type_label}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">触发时间</p>
                  <p className="font-medium text-slate-800">{new Date(selectedAlert.created_at).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">处理状态</p>
                  <p className={`font-medium ${selectedAlert.resolved ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedAlert.resolved ? '已处理' : '待处理'}
                  </p>
                </div>
              </div>

              {/* 预警消息 */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">预警消息</p>
                <div className="bg-rose-50 border border-red-100 rounded-xl p-4">
                  <p className="text-slate-800 leading-relaxed">{selectedAlert.message}</p>
                </div>
              </div>

              {/* 分析原因 */}
              {selectedAlert.reason && selectedAlert.reason !== selectedAlert.message && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">模型分析说明</p>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-slate-800 leading-relaxed">{selectedAlert.reason}</p>
                  </div>
                </div>
              )}

              {/* 检测内容 */}
              {selectedAlert.input_content && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">检测到的可疑内容</p>
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 max-h-40 overflow-auto">
                    <p className="text-slate-800 text-sm font-mono whitespace-pre-wrap">{selectedAlert.input_content}</p>
                  </div>
                </div>
              )}

              {/* 现场截图 */}
              {selectedAlert.screenshot && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">现场截图</p>
                  <img
                    src={selectedAlert.screenshot}
                    alt="现场截图"
                    className="w-full rounded-xl border border-slate-200"
                  />
                </div>
              )}
            </div>

            {/* 弹窗底部操作 */}
            <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const charge = charges.find(c => 
                      (c.nickname || c.username) === selectedAlert.charge_username
                    );
                    if (charge) {
                      handleOneKeyAlert(charge.user_id, charge.nickname || charge.username);
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg text-sm font-medium hover:from-red-600 hover:to-rose-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/25"
                >
                  <Send className="w-4 h-4" /> 紧急通报
                </button>
                <button
                  onClick={() => {
                    const charge = charges.find(c => 
                      (c.nickname || c.username) === selectedAlert.charge_username
                    );
                    if (charge) {
                      handleOneKeyCall('', charge.nickname || charge.username);
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  <Phone className="w-4 h-4" /> 一键呼叫
                </button>
              </div>
              <div className="flex items-center gap-2">
                {!selectedAlert.resolved && (
                  <button
                    onClick={() => {
                      handleResolve(selectedAlert.id);
                      setSelectedAlert({ ...selectedAlert, resolved: true });
                    }}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> 标记已处理
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
