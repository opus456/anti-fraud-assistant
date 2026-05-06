import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon, PhotoIcon, MicrophoneIcon, ArrowUpTrayIcon,
  XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, ShieldCheckIcon,
  DocumentTextIcon, CpuChipIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import toast from 'react-hot-toast';
import RiskWarningModal, { generateProtectionActions } from '../components/RiskWarningModal';
import { ScrollReveal } from '../components/motion';

type ModalityTab = 'text' | 'image' | 'audio';

interface DetectionApiResult {
  is_fraud: boolean; risk_level: string; risk_score: number;
  fraud_type: string | null; fraud_type_label: string; analysis: string;
  cot_reasoning: { intent_analysis?: string; risk_factors?: string[]; reasoning_chain?: string[]; keywords?: string[] } | null;
  matched_cases: Array<{ title: string; similarity: number }>;
  suggestions: string[]; warning_scripts: string[]; response_time_ms: number;
  alert_actions: string[]; pipeline: Record<string, unknown> | null;
}

type AnalysisStage = 'preparing' | 'uploading' | 'analyzing' | 'reasoning' | 'complete';
const stageLabels: Record<AnalysisStage, string> = { preparing: '准备数据...', uploading: '上传内容...', analyzing: 'AI 模型分析中...', reasoning: '思维链推理...', complete: '分析完成' };
const stageProgress: Record<AnalysisStage, number> = { preparing: 10, uploading: 30, analyzing: 60, reasoning: 85, complete: 100 };

// 神经网络加载动画
function NeuralLoading() {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-24 h-24 mb-4">
        {[0,1,2,3,4,5].map(i => (
          <motion.div key={i} className="neural-node absolute"
            style={{ left: `${20 + Math.cos(i * Math.PI / 3) * 30}px`, top: `${20 + Math.sin(i * Math.PI / 3) * 30}px` }}
            animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        <motion.div className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <CpuChipIcon className="w-8 h-8 text-sky-500" />
        </motion.div>
      </div>
      <p className="text-slate-500 text-sm">AI 神经网络处理中...</p>
    </div>
  );
}

export default function Detection() {
  const [activeTab, setActiveTab] = useState<ModalityTab>('text');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('preparing');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [result, setResult] = useState<DetectionApiResult | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs = [
    { id: 'text' as ModalityTab, label: '文本检测', icon: ChatBubbleLeftRightIcon },
    { id: 'image' as ModalityTab, label: '图片检测', icon: PhotoIcon },
    { id: 'audio' as ModalityTab, label: '音频检测', icon: MicrophoneIcon },
  ];
  const activeTabMeta: Record<ModalityTab, { eyebrow: string; title: string; description: string; placeholder?: string; emptyHint: string; uploadHint?: string }> = {
    text: {
      eyebrow: '文本内容识别',
      title: '粘贴可疑对话或通知文本',
      description: '适合检测聊天记录、短信通知、转账提醒和推广文案，系统会提取关键风险话术并给出结论。',
      placeholder: '请粘贴需要检测的聊天记录、短信内容或通知文案...',
      emptyHint: '输入文本后即可查看风险判断、关键词和处置建议。',
    },
    image: {
      eyebrow: '图片内容识别',
      title: '上传聊天截图或转账页面',
      description: '适合检测聊天截图、付款凭证、二维码页面和伪造通知，系统会自动识别图中风险信息。',
      emptyHint: '上传图片后即可提取图中文字并生成风险分析。',
      uploadHint: '支持聊天截图、转账截图、二维码页面等图片内容',
    },
    audio: {
      eyebrow: '语音内容识别',
      title: '上传语音消息或通话录音',
      description: '适合检测语音消息、电话录音和疑似合成语音，系统会分析话术风险与诱导行为。',
      emptyHint: '上传音频后即可查看语义分析和风险提示。',
      uploadHint: '支持语音消息、通话录音，也可识别疑似 AI 合成语音',
    },
  };

  useEffect(() => {
    if (isAnalyzing) { timerRef.current = setInterval(() => setElapsedTime(prev => Math.min(prev + 100, 9600)), 100); }
    else { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isAnalyzing]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); const reader = new FileReader(); reader.onload = () => setImagePreview(reader.result as string); reader.readAsDataURL(file); }
  }, []);
  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) setAudioFile(file); }, []);
  const clearImage = () => { setImageFile(null); setImagePreview(null); if (imageInputRef.current) imageInputRef.current.value = ''; };
  const clearAudio = () => { setAudioFile(null); if (audioInputRef.current) audioInputRef.current.value = ''; };

  // 拖拽处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) { setActiveTab('image'); setImageFile(file); const reader = new FileReader(); reader.onload = () => setImagePreview(reader.result as string); reader.readAsDataURL(file); }
    else if (file.type.startsWith('audio/')) { setActiveTab('audio'); setAudioFile(file); }
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true); setResult(null); setElapsedTime(0); setAnalysisStage('preparing');
    try {
      let response;
      setTimeout(() => setAnalysisStage('uploading'), 300);
      if (activeTab === 'text') { setTimeout(() => setAnalysisStage('analyzing'), 800); response = await api.post('/detection/text', { content: textInput.trim() }); }
      else if (activeTab === 'image' && imageFile) { setTimeout(() => setAnalysisStage('analyzing'), 1500); const fd = new FormData(); fd.append('file', imageFile); fd.append('context', '用户上传图片进行诈骗检测'); response = await api.post('/detection/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      else if (activeTab === 'audio' && audioFile) { setTimeout(() => setAnalysisStage('analyzing'), 2000); const fd = new FormData(); fd.append('file', audioFile); fd.append('context', '用户上传音频进行诈骗检测'); response = await api.post('/detection/audio', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      else { throw new Error('请提供有效的检测内容'); }
      setAnalysisStage('reasoning');
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisStage('complete');
      const apiResult: DetectionApiResult = response.data;
      setResult(apiResult);
      if (apiResult.risk_level === 'high' || apiResult.risk_level === 'danger' || apiResult.risk_level === 'medium' || apiResult.risk_level === 'warning') {
        setTimeout(() => setShowWarningModal(true), 300);
      }
      toast.success('检测完成');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '检测失败，请稍后重试';
      toast.error(msg); setAnalysisStage('preparing');
    } finally { setIsAnalyzing(false); }
  };

  const canAnalyze = () => { switch (activeTab) { case 'text': return textInput.trim().length > 0; case 'image': return imageFile !== null; case 'audio': return audioFile !== null; default: return false; } };
  const getRiskLabel = (l: string) => { switch (l) { case 'safe': case 'low': return '安全'; case 'warning': case 'medium': return '可疑'; case 'danger': case 'high': return '高风险'; case 'critical': return '极高风险'; case 'unknown': return '无法分析'; default: return '未知'; } };
  const getRiskColor = (l: string) => { switch (l) { case 'safe': case 'low': return 'safe'; case 'warning': case 'medium': return 'warning'; case 'danger': case 'high': case 'critical': return 'danger'; case 'unknown': return 'warning'; default: return 'safe'; } };
  const highlightKeywords = (text: string, keywords: string[] = []) => { if (!keywords.length) return text; let r = text; keywords.forEach(k => { r = r.replace(new RegExp(`(${k})`, 'gi'), '<mark class="bg-red-200 text-red-800 px-1 rounded">$1</mark>'); }); return r; };
  const formatTime = (ms: number) => {
    const capped = Math.min(ms, 9999); // 显示不超过10s
    return `${Math.floor(capped / 1000)}.${Math.floor((capped % 1000) / 100)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-lg bg-white border border-slate-200 p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent-50 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-sky-600 text-sm mb-2 font-semibold">智能检测中心</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">一处完成文本、图片、音频风险识别</h1>
            <p className="max-w-2xl text-slate-500 text-sm leading-6">把可疑内容贴进来或上传文件，系统会结合反诈模型、关键词命中和案例比对给出判断结果。</p>
          </div>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* 左侧输入 */}
        <div className={`card relative ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
          {/* 扫描线 */}
          {isAnalyzing && <div className="scan-line" />}

          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">{activeTabMeta[activeTab].eyebrow}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{activeTabMeta[activeTab].title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{activeTabMeta[activeTab].description}</p>
          </div>

          {/* Tab */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-accent-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 文本输入 */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={activeTabMeta.text.placeholder} className="input min-h-[220px] resize-none" disabled={isAnalyzing} />
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{textInput.length} 字符</span>
                <span className="flex items-center gap-1"><CpuChipIcon className="w-4 h-4" />模型将提取风险话术与关键词</span>
              </div>
            </div>
          )}

          {/* 图片上传 - 增强拖拽区 */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden bg-slate-100">
                  <img src={imagePreview} alt="预览" className="w-full h-64 object-contain" />
                  <button onClick={clearImage} className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div onClick={() => imageInputRef.current?.click()}
                  className={`drop-zone p-12 text-center ${isDragOver ? 'drag-over' : ''}`}
                >
                  <div className="flex justify-center gap-4 mb-4">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-300" />
                    <PhotoIcon className="w-10 h-10 text-accent-600" />
                    <MicrophoneIcon className="w-8 h-8 text-blue-300" />
                  </div>
                  <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-blue-400 mb-3" />
                  <p className="text-slate-700 font-medium">点击或拖拽上传图片</p>
                  <p className="text-sm text-slate-500 mt-2">{activeTabMeta.image.uploadHint}</p>
                </div>
              )}
            </div>
          )}

          {/* 音频上传 */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioSelect} className="hidden" />
              {audioFile ? (
                <div className="p-6 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-accent-50 flex items-center justify-center"><MicrophoneIcon className="w-8 h-8 text-accent-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{audioFile.name}</p>
                      <p className="text-sm text-slate-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={clearAudio} className="p-2 text-slate-500 hover:text-rose-600 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              ) : (
                <div onClick={() => audioInputRef.current?.click()}
                  className={`drop-zone p-12 text-center ${isDragOver ? 'drag-over' : ''}`}
                >
                  <div className="flex justify-center gap-4 mb-4">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-300" />
                    <MicrophoneIcon className="w-10 h-10 text-accent-600" />
                    <PhotoIcon className="w-8 h-8 text-blue-300" />
                  </div>
                  <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-blue-400 mb-3" />
                  <p className="text-slate-700 font-medium">点击或拖拽上传音频</p>
                  <p className="text-sm text-slate-500 mt-2">{activeTabMeta.audio.uploadHint}</p>
                </div>
              )}
            </div>
          )}

          {/* 分析按钮 */}
          <button onClick={handleAnalyze} disabled={!canAnalyze() || isAnalyzing}
            className={`btn btn-primary w-full mt-6 py-4 text-base ${(!canAnalyze() || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-3">
                <motion.div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                <span>{stageLabels[analysisStage]}</span>
                <span className="text-white/70">{formatTime(elapsedTime)}</span>
              </div>
            ) : (<><SparklesIcon className="w-5 h-5" />开始 AI 分析</>)}
          </button>

          <AnimatePresence>
            {isAnalyzing && (
              <motion.div className="mt-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-accent-500" initial={{ width: '0%' }} animate={{ width: `${stageProgress[analysisStage]}%` }} transition={{ duration: 0.5 }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500"><span>数据准备</span><span>模型分析</span><span>推理生成</span><span>完成</span></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 右侧结果 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-accent-600" />分析结果
          </h2>
          {isAnalyzing ? (
            <NeuralLoading />
          ) : result ? (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className={`text-center p-6 rounded-lg ${getRiskColor(result.risk_level) === 'danger' ? 'bg-rose-50 border border-rose-200' : getRiskColor(result.risk_level) === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div className={`risk-orb risk-orb-${getRiskColor(result.risk_level)} mx-auto mb-4`}><span className="risk-orb-value">{Math.round(result.risk_score * 100)}</span></div>
                <span className={`status-badge status-${getRiskColor(result.risk_level)} text-base px-4 py-2`}>{getRiskLabel(result.risk_level)}</span>
                {result.fraud_type_label && <p className="mt-3 text-slate-700 font-semibold text-lg">{result.fraud_type_label}</p>}
                <p className="text-sm text-slate-500 mt-2">响应时间: {Math.min(result.response_time_ms, 9999)}ms</p>
              </div>
              {result.analysis && (
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2"><CpuChipIcon className="w-5 h-5 text-accent-600" />AI 分析结论</h3>
                  <p className="text-slate-500 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightKeywords(result.analysis, result.cot_reasoning?.keywords || []) }} />
                </div>
              )}
              {result.cot_reasoning?.reasoning_chain && result.cot_reasoning.reasoning_chain.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-500" />思维链推理</h3>
                  <div className="space-y-2">
                    {result.cot_reasoning.reasoning_chain.map((step, idx) => (
                      <motion.div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                        <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                        <p className="text-slate-500 text-sm">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {result.cot_reasoning?.risk_factors && result.cot_reasoning.risk_factors.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />风险因素</h3>
                  <ul className="space-y-2">{result.cot_reasoning.risk_factors.map((f, i) => (<li key={i} className="flex items-start gap-2 text-slate-500"><ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />{f}</li>))}</ul>
                </div>
              )}
              {result.cot_reasoning?.keywords && result.cot_reasoning.keywords.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3">检测到的诈骗关键词</h3>
                  <div className="flex flex-wrap gap-2">{result.cot_reasoning.keywords.map((k, i) => (<span key={i} className="px-3 py-1 rounded-full bg-rose-50 text-red-700 text-sm font-medium border border-rose-200">{k}</span>))}</div>
                </div>
              )}
              {result.suggestions.length > 0 && (
                <div className={`p-4 rounded-lg ${getRiskColor(result.risk_level) === 'danger' ? 'bg-rose-50 border border-rose-200' : getRiskColor(result.risk_level) === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5 text-emerald-600" />安全建议</h3>
                  <ul className="space-y-2">{result.suggestions.map((s, i) => (<li key={i} className="flex items-start gap-2 text-slate-500"><CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />{s}</li>))}</ul>
                </div>
              )}
              {result.matched_cases.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-accent-600" />相似诈骗案例</h3>
                  <div className="space-y-2">
                    {result.matched_cases.slice(0, 3).map((c, i) => (
                      <div key={i} className="p-3 bg-accent-50 rounded-lg border border-accent-200 flex items-center justify-between">
                        <span className="text-slate-700 text-sm">{c.title}</span>
                        <span className="text-xs text-accent-600 font-medium">相似度 {Math.round(c.similarity * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <ShieldCheckIcon className="w-20 h-20 mx-auto text-gray-200 mb-4" />
              </motion.div>
              <p className="text-slate-700 text-lg font-medium">结果将在这里显示</p>
              <p className="text-slate-500 text-sm mt-2">{activeTabMeta[activeTab].emptyHint}</p>
              <p className="text-sky-600 text-xs mt-4">图片和音频模式支持直接拖拽文件到左侧区域</p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <RiskWarningModal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)}
          riskLevel={result.risk_level === 'high' || result.risk_level === 'danger' ? 'high' : 'medium'}
          riskScore={result.risk_score} fraudType={result.fraud_type || ''} fraudTypeLabel={result.fraud_type_label}
          analysis={result.analysis} warningScripts={result.warning_scripts} suggestions={result.suggestions}
          protectionActions={generateProtectionActions(result.risk_level, result.alert_actions)}
          keywords={result.cot_reasoning?.keywords || []}
        />
      )}
    </div>
  );
}
