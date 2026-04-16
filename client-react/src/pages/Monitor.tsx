import { useState } from 'react';
import {
  PhoneIcon, PhoneArrowDownLeftIcon, PhoneArrowUpRightIcon,
  ShieldCheckIcon, ExclamationTriangleIcon, MicrophoneIcon,
  ChatBubbleLeftIcon, EnvelopeIcon, SparklesIcon, InboxArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useModeStore } from '../store/modeStore';
import { ScrollReveal, StaggerContainer, StaggerItem, HoverCard } from '../components/motion';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface CallRecord { id: string; type: 'incoming' | 'outgoing'; number: string; contact?: string; duration: string; time: string; riskLevel: 'safe' | 'warning' | 'danger'; riskScore: number; isAiVoice?: boolean; }
interface SmsRecord { id: string; sender: string; content: string; time: string; riskLevel: 'safe' | 'warning' | 'danger'; riskScore: number; fraudType?: string; }

const mockCalls: CallRecord[] = [
  { id: '1', type: 'incoming', number: '138****5678', contact: '快递员小王', duration: '2:34', time: '10:30', riskLevel: 'safe', riskScore: 5 },
  { id: '2', type: 'incoming', number: '400-888-9999', duration: '5:21', time: '09:15', riskLevel: 'danger', riskScore: 92, isAiVoice: true },
  { id: '3', type: 'outgoing', number: '139****1234', contact: '妈妈', duration: '15:42', time: '昨天', riskLevel: 'safe', riskScore: 0 },
  { id: '4', type: 'incoming', number: '021-12345678', duration: '1:05', time: '昨天', riskLevel: 'warning', riskScore: 65, isAiVoice: true },
];
const mockSms: SmsRecord[] = [
  { id: 's1', sender: '95588', content: '【工商银行】您的账户余额变动...', time: '10:15', riskLevel: 'safe', riskScore: 2 },
  { id: 's2', sender: '106****8888', content: '恭喜您中奖100万元！点击链接领取：http://xxx.cn/prize', time: '09:30', riskLevel: 'danger', riskScore: 98, fraudType: '中奖诈骗' },
  { id: 's3', sender: '10086', content: '您本月流量即将用尽，建议充值...', time: '昨天', riskLevel: 'safe', riskScore: 0 },
  { id: 's4', sender: '106****5555', content: '【刷单赚钱】日结工资300-500元，在家就能做！微信xxxx', time: '昨天', riskLevel: 'danger', riskScore: 95, fraudType: '刷单诈骗' },
  { id: 's5', sender: '106****2222', content: '您有一笔退款待领取，请点击链接核实身份...', time: '前天', riskLevel: 'warning', riskScore: 72, fraudType: '冒充客服' },
];

// 均衡器组件
function Equalizer({ active, color = 'bg-sky-500' }: { active: boolean; color?: string }) {
  if (!active) return null;
  return (
    <div className="equalizer">
      {[0,1,2,3,4].map(i => (<div key={i} className={`equalizer-bar ${color}`} style={{ animationDelay: `${i * 0.15}s` }} />))}
    </div>
  );
}

// 大脑+声波动态图标
function DeepfakeIcon() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        <SparklesIcon className="w-5 h-5 text-purple-600" />
      </motion.div>
      {/* 声波扩散 */}
      {[0,1,2].map(i => (
        <motion.div key={i} className="absolute inset-0 rounded-full border border-purple-300"
          animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
    </div>
  );
}

export default function Monitor() {
  const { mode } = useModeStore();
  const [isCallMonitoring, setIsCallMonitoring] = useState(true);
  const [isSmsMonitoring, setIsSmsMonitoring] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'call' | 'sms'>('call');
  const isElderMode = mode === 'elder';

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'safe': return <ShieldCheckIcon className="w-5 h-5 text-safe-500" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-warning-500" />;
      case 'danger': return <ExclamationTriangleIcon className="w-5 h-5 text-danger-500" />;
      default: return null;
    }
  };
  const getRiskLabel = (l: string) => { switch (l) { case 'safe': case 'low': return '安全'; case 'warning': case 'medium': return '可疑'; case 'danger': case 'high': return '高风险'; case 'critical': return '极高风险'; default: return '未知'; } };

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="content-header">
          <h1 className="page-title">实时监控</h1>
          <p className="page-subtitle">{isElderMode ? '全面监测通话和短信安全状态，守护您的安全' : '监测通话和消息安全状态'}</p>
        </div>
      </ScrollReveal>

      {/* 监控状态卡片 */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <HoverCard className="card-glass text-center p-4 hover-glow">
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${isCallMonitoring ? 'bg-safe-100' : 'bg-surface-200'}`}>
              <MicrophoneIcon className={`w-8 h-8 ${isCallMonitoring ? 'text-safe-500' : 'text-text-muted'}`} />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h3 className="font-semibold text-text-title text-sm">通话监控</h3>
              <Equalizer active={isCallMonitoring} color="bg-green-500" />
            </div>
            <p className="text-xs text-text-muted mb-3">{isCallMonitoring ? '监控中' : '已暂停'}</p>
            <button onClick={() => setIsCallMonitoring(!isCallMonitoring)}
              className={`btn btn-sm w-full ${isCallMonitoring ? 'btn-danger' : 'btn-primary'}`}
            >{isCallMonitoring ? '暂停' : '开启'}</button>
          </HoverCard>
        </StaggerItem>

        <StaggerItem>
          <HoverCard className={`card-glass text-center p-4 hover-glow ${isElderMode ? 'ring-2 ring-sky-400' : ''}`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${isSmsMonitoring ? 'bg-sky-100' : 'bg-surface-200'}`}>
              <EnvelopeIcon className={`w-8 h-8 ${isSmsMonitoring ? 'text-sky-500' : 'text-text-muted'}`} />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h3 className="font-semibold text-text-title text-sm">短信监控</h3>
              <Equalizer active={isSmsMonitoring} />
            </div>
            <p className="text-xs text-text-muted mb-3">{isSmsMonitoring ? '监控中' : '已暂停'}</p>
            <button onClick={() => setIsSmsMonitoring(!isSmsMonitoring)}
              className={`btn btn-sm w-full ${isSmsMonitoring ? 'btn-danger' : 'btn-primary'}`}
            >{isSmsMonitoring ? '暂停' : '开启'}</button>
          </HoverCard>
        </StaggerItem>

        <StaggerItem>
          <HoverCard className="stat-card hover-glow">
            <div className="stat-icon bg-primary-100"><PhoneIcon className="w-6 h-6 text-primary-500" /></div>
            <div className="stat-value text-xl">24</div>
            <div className="stat-label text-xs">今日通话</div>
          </HoverCard>
        </StaggerItem>

        <StaggerItem>
          <HoverCard className="stat-card pulse-shadow-red hover-glow">
            <div className="stat-icon bg-danger-100"><ExclamationTriangleIcon className="w-6 h-6 text-danger-500" /></div>
            <div className="stat-value text-xl text-danger-500">3</div>
            <div className="stat-label text-xs">风险拦截</div>
          </HoverCard>
        </StaggerItem>
      </StaggerContainer>

      {/* AI 语音检测提示 - 动态图标 */}
      <ScrollReveal delay={0.1}>
        <div className="card-glass bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-200">
          <div className="flex items-center gap-3">
            <DeepfakeIcon />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-800">AI 语音合成检测 (Deepfake)</h3>
              <p className="text-sm text-purple-600">系统已启用 AI 合成语音识别，可检测深度伪造音频</p>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
              <div className="breathing-dot breathing-dot-safe" style={{ width: 6, height: 6, background: '#8B5CF6', boxShadow: '0 0 6px rgba(139,92,246,0.6)' }} />
              已启用
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* Tab */}
      <ScrollReveal delay={0.15}>
        <div className="flex gap-2 border-b border-slate-200">
          <button onClick={() => setActiveTab('call')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'call' ? 'text-primary-600 border-primary-500' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
          ><PhoneIcon className="w-4 h-4 inline mr-1.5" />通话记录</button>
          <button onClick={() => setActiveTab('sms')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'sms' ? 'text-primary-600 border-primary-500' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
          ><ChatBubbleLeftIcon className="w-4 h-4 inline mr-1.5" />短信监控
            {isElderMode && <span className="ml-1.5 px-1.5 py-0.5 bg-sky-100 text-sky-600 rounded text-xs">推荐</span>}
          </button>
        </div>
      </ScrollReveal>

      {/* 通话记录 */}
      {activeTab === 'call' && (
        <ScrollReveal delay={0.2}>
          <div className="card-glass">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-title">近期通话</h2>
              <span className="status-badge status-safe"><ShieldCheckIcon className="w-4 h-4 mr-1" />AI 实时分析中</span>
            </div>
            <div className="space-y-3">
              {mockCalls.map(call => (
                <div key={call.id} onClick={() => setSelectedCall(call)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${selectedCall?.id === call.id ? 'bg-primary-50 border border-primary-200' : 'bg-surface-50/80 hover:bg-surface-100'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${call.type === 'incoming' ? 'bg-safe-100' : 'bg-primary-100'}`}>
                    {call.type === 'incoming' ? <PhoneArrowDownLeftIcon className="w-6 h-6 text-safe-500" /> : <PhoneArrowUpRightIcon className="w-6 h-6 text-primary-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text-title">{call.contact || call.number}</span>
                      {getRiskIcon(call.riskLevel)}
                      {call.isAiVoice && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-xs flex items-center gap-1"><SparklesIcon className="w-3 h-3" />疑似AI语音</span>
                      )}
                    </div>
                    <div className="text-sm text-text-muted flex items-center gap-3"><span>{call.number}</span><span>·</span><span>{call.duration}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-text-muted">{call.time}</div>
                    <div className={`text-sm font-medium ${call.riskLevel === 'safe' ? 'text-safe-500' : call.riskLevel === 'warning' ? 'text-warning-500' : 'text-danger-500'}`}>
                      风险值: {call.riskScore}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* 短信监控 */}
      {activeTab === 'sms' && (
        <ScrollReveal delay={0.2}>
          <div className="card-glass">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-title">短信监控{isElderMode && <span className="ml-2 text-sm font-normal text-sky-600">(为您重点保护)</span>}</h2>
              <Link to="/sms-inbox" className="text-sm text-primary-600 hover:text-primary-700"><InboxArrowDownIcon className="w-4 h-4 inline mr-1" />查看收件箱</Link>
            </div>
            <div className="space-y-3">
              {mockSms.map(sms => (
                <div key={sms.id} className={`p-4 rounded-xl transition-all ${sms.riskLevel === 'danger' ? 'bg-red-50 border border-red-200' : sms.riskLevel === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-surface-50/80'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${sms.riskLevel === 'danger' ? 'bg-red-100' : sms.riskLevel === 'warning' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                      <ChatBubbleLeftIcon className={`w-5 h-5 ${sms.riskLevel === 'danger' ? 'text-red-500' : sms.riskLevel === 'warning' ? 'text-amber-500' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-text-title">{sms.sender}</span>
                        {getRiskIcon(sms.riskLevel)}
                        {sms.fraudType && <span className={`px-2 py-0.5 rounded text-xs font-medium ${sms.riskLevel === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{sms.fraudType}</span>}
                        <span className="text-xs text-text-muted ml-auto">{sms.time}</span>
                      </div>
                      <p className={`text-sm ${sms.riskLevel === 'danger' ? 'text-red-800' : sms.riskLevel === 'warning' ? 'text-amber-800' : 'text-text-body'}`}>{sms.content}</p>
                      {sms.riskLevel !== 'safe' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-xs font-medium ${sms.riskLevel === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>风险值: {sms.riskScore}</span>
                          <span className="text-xs text-text-muted">|</span>
                          <span className="text-xs text-green-600">已自动标记</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {isElderMode && (
              <div className="mt-4 p-3 bg-sky-50 rounded-lg border border-sky-200">
                <p className="text-sm text-sky-800">💡 <strong>温馨提示：</strong>系统会自动扫描短信内容，发现诈骗信息会第一时间通知您的监护人。</p>
              </div>
            )}
          </div>
        </ScrollReveal>
      )}

      {/* 通话详情 */}
      {selectedCall && activeTab === 'call' && (
        <ScrollReveal delay={0.25}>
          <div className="card-glass">
            <h3 className="font-semibold text-text-title mb-4">通话详情</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><span className="text-text-muted text-sm">号码</span><p className="font-medium text-text-title">{selectedCall.number}</p></div>
              <div><span className="text-text-muted text-sm">联系人</span><p className="font-medium text-text-title">{selectedCall.contact || '未知'}</p></div>
              <div><span className="text-text-muted text-sm">通话时长</span><p className="font-medium text-text-title">{selectedCall.duration}</p></div>
              <div><span className="text-text-muted text-sm">风险评估</span><p className={`font-medium ${selectedCall.riskLevel === 'safe' ? 'text-safe-500' : selectedCall.riskLevel === 'warning' ? 'text-warning-500' : 'text-danger-500'}`}>{getRiskLabel(selectedCall.riskLevel)}</p></div>
            </div>
            {selectedCall.isAiVoice && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2"><DeepfakeIcon /><span className="font-medium text-purple-800">检测到疑似 AI 合成语音</span></div>
                <p className="text-sm text-purple-700 mt-1">该通话可能使用了深度伪造技术，请务必核实对方身份，不要轻信任何转账要求。</p>
              </div>
            )}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
