import { useState } from 'react';
import {
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  
  MicrophoneIcon,
  PlayIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface CallRecord {
  id: string;
  type: 'incoming' | 'outgoing';
  number: string;
  contact?: string;
  duration: string;
  time: string;
  riskLevel: 'safe' | 'warning' | 'danger';
  riskScore: number;
}

const mockCalls: CallRecord[] = [
  { id: '1', type: 'incoming', number: '138****5678', contact: '快递员小王', duration: '2:34', time: '10:30', riskLevel: 'safe', riskScore: 5 },
  { id: '2', type: 'incoming', number: '400-888-9999', duration: '5:21', time: '09:15', riskLevel: 'danger', riskScore: 92 },
  { id: '3', type: 'outgoing', number: '139****1234', contact: '妈妈', duration: '15:42', time: '昨天', riskLevel: 'safe', riskScore: 0 },
  { id: '4', type: 'incoming', number: '021-12345678', duration: '1:05', time: '昨天', riskLevel: 'warning', riskScore: 65 },
];

export default function Monitor() {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'safe': return <ShieldCheckIcon className="w-5 h-5 text-safe-500" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-warning-500" />;
      case 'danger': return <ExclamationTriangleIcon className="w-5 h-5 text-danger-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="content-header">
        <h1 className="page-title">实时监控</h1>
        <p className="page-subtitle">监测通话和消息安全状态</p>
      </div>

      {/* 监控状态 */}
      <div className="card-grid-3">
        <div className="card text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isMonitoring ? 'bg-safe-100' : 'bg-surface-200'
          }`}>
            <MicrophoneIcon className={`w-10 h-10 ${isMonitoring ? 'text-safe-500' : 'text-text-muted'}`} />
          </div>
          <h3 className="font-semibold text-text-title mb-2">通话监控</h3>
          <p className="text-sm text-text-muted mb-4">
            {isMonitoring ? '正在保护您的通话安全' : '监控已暂停'}
          </p>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`btn ${isMonitoring ? 'btn-danger' : 'btn-primary'}`}
          >
            {isMonitoring ? (
              <>
                <StopIcon className="w-5 h-5 mr-2" />
                暂停监控
              </>
            ) : (
              <>
                <PlayIcon className="w-5 h-5 mr-2" />
                开启监控
              </>
            )}
          </button>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-primary-100">
            <PhoneIcon className="w-6 h-6 text-primary-500" />
          </div>
          <div className="stat-value">24</div>
          <div className="stat-label">今日通话</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-danger-100">
            <ExclamationTriangleIcon className="w-6 h-6 text-danger-500" />
          </div>
          <div className="stat-value">2</div>
          <div className="stat-label">风险拦截</div>
        </div>
      </div>

      {/* 通话记录 */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-title">近期通话</h2>
          <span className="status-badge status-safe">
            <ShieldCheckIcon className="w-4 h-4 mr-1" />
            AI 实时分析中
          </span>
        </div>

        <div className="space-y-3">
          {mockCalls.map((call) => (
            <div
              key={call.id}
              onClick={() => setSelectedCall(call)}
              className={`flex items-center gap-4 p-4 rounded-card cursor-pointer transition-all ${
                selectedCall?.id === call.id
                  ? 'bg-primary-50 border border-primary-200'
                  : 'bg-surface-100 hover:bg-surface-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                call.type === 'incoming' ? 'bg-safe-100' : 'bg-primary-100'
              }`}>
                {call.type === 'incoming' ? (
                  <PhoneArrowDownLeftIcon className="w-6 h-6 text-safe-500" />
                ) : (
                  <PhoneArrowUpRightIcon className="w-6 h-6 text-primary-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-title">
                    {call.contact || call.number}
                  </span>
                  {getRiskIcon(call.riskLevel)}
                </div>
                <div className="text-sm text-text-muted flex items-center gap-3">
                  <span>{call.number}</span>
                  <span>·</span>
                  <span>{call.duration}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-text-muted">{call.time}</div>
                <div className={`text-sm font-medium ${
                  call.riskLevel === 'safe' ? 'text-safe-500' :
                  call.riskLevel === 'warning' ? 'text-warning-500' : 'text-danger-500'
                }`}>
                  风险值: {call.riskScore}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 选中通话详情 */}
      {selectedCall && (
        <div className="card">
          <h3 className="font-semibold text-text-title mb-4">通话详情</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-text-muted text-sm">号码</span>
              <p className="font-medium text-text-title">{selectedCall.number}</p>
            </div>
            <div>
              <span className="text-text-muted text-sm">联系人</span>
              <p className="font-medium text-text-title">{selectedCall.contact || '未知'}</p>
            </div>
            <div>
              <span className="text-text-muted text-sm">通话时长</span>
              <p className="font-medium text-text-title">{selectedCall.duration}</p>
            </div>
            <div>
              <span className="text-text-muted text-sm">风险评估</span>
              <p className={`font-medium ${
                selectedCall.riskLevel === 'safe' ? 'text-safe-500' :
                selectedCall.riskLevel === 'warning' ? 'text-warning-500' : 'text-danger-500'
              }`}>
                {selectedCall.riskLevel === 'safe' ? '安全' :
                 selectedCall.riskLevel === 'warning' ? '可疑' : '高风险'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

