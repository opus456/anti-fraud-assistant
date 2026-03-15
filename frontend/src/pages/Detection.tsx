/**
 * 智能检测页面 - 核心功能
 * 支持文本输入检测，展示详细的分析结果
 */
import { useState, useRef } from 'react';
import { Search, AlertTriangle, Shield, Upload, Loader, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuthStore } from '../store';
import type { DetectionResult } from '../store';

const RISK_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  safe:     { color: 'text-green-600',  bg: 'bg-green-50 border-green-200',   label: '安全' },
  low:      { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: '低风险' },
  medium:   { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: '中风险' },
  high:     { color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       label: '高风险' },
  critical: { color: 'text-red-700',    bg: 'bg-red-100 border-red-300',      label: '极高风险' },
};

const EXAMPLE_TEXTS = [
  '您好，我是XX证券的客服，最近有一个内部理财项目，保本保息年化收益30%，限制名额仅剩3个，请尽快加微信详谈。',
  '【公安局通知】您的银行卡涉嫌洗钱，需配合调查，请立即将资金转入安全账户，账号：6228xxxx，否则将冻结全部资产。',
  '亲，我们平台有刷单兼职，每单佣金5-50元，日结无需垫付，先完成3单体验任务后就可以接大单了！',
  '妈，我的手机坏了，这是我新号码。我出了点事急需用钱，你先转3万到这个账户，回头跟你解释。',
  '今天天气真好，要不要一起出去吃饭？我知道一家新开的火锅店味道不错。',
];

export default function Detection() {
  const [text, setText] = useState('');
  const [imageOcr, setImageOcr] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [multimodalMode, setMultimodalMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleDetect = async () => {
    const hasText = !!text.trim();
    const hasMultimodal = !!(imageOcr.trim() || audioTranscript.trim() || videoDescription.trim());
    if (!hasText && !hasMultimodal) { toast.error('请至少输入一种检测内容'); return; }

    setLoading(true);
    setResult(null);
    try {
      let data;
      if (isAuthenticated && (multimodalMode || hasMultimodal)) {
        const resp = await api.post('/detection/multimodal', {
          text,
          image_ocr: imageOcr,
          audio_transcript: audioTranscript,
          video_description: videoDescription,
          context: '',
        });
        data = resp.data;
      } else {
        const endpoint = isAuthenticated ? '/detection/text' : '/detection/quick';
        const resp = await api.post(endpoint, { content: text });
        data = resp.data;
      }

      setResult(data);
      if (data.is_fraud) {
        toast.error(`⚠️ 检测到${data.fraud_type_label || '诈骗'}风险！`, { duration: 5000 });
      } else {
        toast.success('✅ 该内容暂未发现诈骗特征');
      }
    } catch {
      toast.error('检测失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', text || '');

    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/detection/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success('图片检测完成');
    } catch {
      toast.error('图片检测失败');
    } finally {
      setLoading(false);
    }
  };

  const riskConfig = result ? RISK_CONFIG[result.risk_level] || RISK_CONFIG.safe : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-0">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="w-7 h-7 text-primary-500" />
          智能反诈检测
        </h1>
        <p className="text-sm text-gray-500 mt-1">输入可疑信息，AI将实时分析诈骗风险</p>
      </div>

      {/* 输入区域 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="粘贴可疑的短信、聊天记录、邮件内容等..."
          className="w-full h-40 resize-none border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          maxLength={10000}
        />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Upload className="w-4 h-4" /> 上传截图
            </button>
            <span className="text-xs text-gray-400">{text.length}/10000</span>
            {isAuthenticated && (
              <button
                onClick={() => setMultimodalMode((v) => !v)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
              >
                {multimodalMode ? '关闭多模态' : '开启多模态'}
              </button>
            )}
          </div>
          <button
            onClick={handleDetect}
            disabled={loading || !text.trim()}
            className="flex items-center gap-2 px-8 py-3 bg-danger-500 hover:bg-danger-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? 'AI分析中...' : '立即检测'}
          </button>
        </div>

        {isAuthenticated && multimodalMode && (
          <div className="mt-4 grid grid-cols-1 gap-3">
            <textarea
              value={imageOcr}
              onChange={(e) => setImageOcr(e.target.value)}
              placeholder="可选：粘贴图片OCR识别文本"
              className="w-full h-20 resize-none border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              maxLength={10000}
            />
            <textarea
              value={audioTranscript}
              onChange={(e) => setAudioTranscript(e.target.value)}
              placeholder="可选：粘贴音频转写文本"
              className="w-full h-20 resize-none border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              maxLength={10000}
            />
            <textarea
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              placeholder="可选：粘贴视频关键画面描述"
              className="w-full h-20 resize-none border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              maxLength={10000}
            />
          </div>
        )}

        {/* 示例文本 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">💡 点击示例快速体验：</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_TEXTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setText(ex)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-600 text-gray-600 rounded-lg text-xs transition-colors"
              >
                示例 {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 检测结果 */}
      {result && riskConfig && (
        <div className={`rounded-2xl border-2 ${riskConfig.bg} p-6 animate-slide-up`}>
          {/* 风险概览 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {result.is_fraud ? (
                <AlertTriangle className={`w-8 h-8 ${riskConfig.color}`} />
              ) : (
                <Shield className="w-8 h-8 text-green-600" />
              )}
              <div>
                <h2 className={`text-xl font-bold ${riskConfig.color}`}>
                  {riskConfig.label}
                  {result.fraud_type_label && ` - ${result.fraud_type_label}`}
                </h2>
                <p className="text-sm text-gray-600">响应时间: {result.response_time_ms}ms</p>
              </div>
            </div>
            {/* 风险评分圆环 */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#e5e7eb" strokeWidth="3"
                />
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={result.risk_score > 0.6 ? '#dc2626' : result.risk_score > 0.3 ? '#f59e0b' : '#10b981'}
                  strokeWidth="3"
                  strokeDasharray={`${result.risk_score * 100}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${riskConfig.color}`}>
                  {(result.risk_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* 分析说明 */}
          <div className="bg-white/60 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">📋 分析报告</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{result.analysis}</p>
          </div>

          {/* 预警话术 */}
          {result.warning_scripts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">🚨 安全警告</h3>
              {result.warning_scripts.map((script, i) => (
                <p key={i} className="text-sm text-red-700 mb-1">{script}</p>
              ))}
            </div>
          )}

          {/* 防御建议 */}
          {result.suggestions.length > 0 && (
            <div className="bg-white/60 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">🛡️ 防御建议</h3>
              <ul className="space-y-1">
                {result.suggestions.slice(0, 5).map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 预警动作 */}
          {result.alert_actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-gray-600 font-medium">触发动作:</span>
              {result.alert_actions.map((action) => (
                <span key={action} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                  {{popup:'弹窗提醒', voice:'语音警告', guardian:'通知监护人', lock:'设备锁定'}[action] || action}
                </span>
              ))}
            </div>
          )}

          {/* 匹配案例 */}
          {result.matched_cases.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
              >
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                相似案例匹配 ({result.matched_cases.length})
              </button>
              {showDetails && (
                <div className="mt-2 space-y-2">
                  {result.matched_cases.map((c, i) => (
                    <div key={i} className="bg-white/60 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-800">{c.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{c.content}</p>
                      <p className="text-xs text-primary-500 mt-1">相似度: {(c.similarity * 100).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
