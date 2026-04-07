import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  MicrophoneIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  CpuChipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import toast from 'react-hot-toast';
import RiskWarningModal, { generateProtectionActions } from '../components/RiskWarningModal';
import { ScrollReveal } from '../components/motion';

type ModalityTab = 'text' | 'image' | 'audio';

// 后端返回的检测结果结构
interface DetectionApiResult {
  is_fraud: boolean;
  risk_level: string;
  risk_score: number;
  fraud_type: string | null;
  fraud_type_label: string;
  analysis: string;
  cot_reasoning: {
    intent_analysis?: string;
    risk_factors?: string[];
    reasoning_chain?: string[];
    keywords?: string[];
  } | null;
  matched_cases: Array<{ title: string; similarity: number }>;
  suggestions: string[];
  warning_scripts: string[];
  response_time_ms: number;
  alert_actions: string[];
  pipeline: Record<string, unknown> | null;
}

// 检测进度阶段
type AnalysisStage = 'preparing' | 'uploading' | 'analyzing' | 'reasoning' | 'complete';

const stageLabels: Record<AnalysisStage, string> = {
  preparing: '准备数据...',
  uploading: '上传内容...',
  analyzing: 'AI 模型分析中...',
  reasoning: '思维链推理...',
  complete: '分析完成',
};

const stageProgress: Record<AnalysisStage, number> = {
  preparing: 10,
  uploading: 30,
  analyzing: 60,
  reasoning: 85,
  complete: 100,
};

export default function Detection() {
  const [activeTab, setActiveTab] = useState<ModalityTab>('text');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  // 分析状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('preparing');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [result, setResult] = useState<DetectionApiResult | null>(null);
  
  // 警告弹窗
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const tabs = [
    { id: 'text' as ModalityTab, label: '文本检测', icon: ChatBubbleLeftRightIcon },
    { id: 'image' as ModalityTab, label: '图片检测', icon: PhotoIcon },
    { id: 'audio' as ModalityTab, label: '音频检测', icon: MicrophoneIcon },
  ];

  // 计时器
  useEffect(() => {
    if (isAnalyzing) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 100);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnalyzing]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  }, []);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const clearAudio = () => {
    setAudioFile(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // 真实 API 调用
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResult(null);
    setElapsedTime(0);
    setAnalysisStage('preparing');

    try {
      let response;

      // 模拟阶段进度
      setTimeout(() => setAnalysisStage('uploading'), 300);

      if (activeTab === 'text') {
        setTimeout(() => setAnalysisStage('analyzing'), 800);
        response = await api.post('/detection/text', {
          content: textInput.trim(),
        });
      } else if (activeTab === 'image' && imageFile) {
        setTimeout(() => setAnalysisStage('analyzing'), 1500);
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('context', '用户上传图片进行诈骗检测');
        response = await api.post('/detection/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (activeTab === 'audio' && audioFile) {
        setTimeout(() => setAnalysisStage('analyzing'), 2000);
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('context', '用户上传音频进行诈骗检测');
        response = await api.post('/detection/audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        throw new Error('请提供有效的检测内容');
      }

      setAnalysisStage('reasoning');
      
      // 稍微延迟以显示推理阶段
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAnalysisStage('complete');
      const apiResult: DetectionApiResult = response.data;
      setResult(apiResult);

      // 如果是高/中风险，弹出警告
      if (apiResult.risk_level === 'high' || apiResult.risk_level === 'danger' || apiResult.risk_level === 'medium' || apiResult.risk_level === 'warning') {
        setTimeout(() => setShowWarningModal(true), 300);
      }

      toast.success('检测完成');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '检测失败，请稍后重试';
      toast.error(errorMessage);
      setAnalysisStage('preparing');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = () => {
    switch (activeTab) {
      case 'text': return textInput.trim().length > 0;
      case 'image': return imageFile !== null;
      case 'audio': return audioFile !== null;
      default: return false;
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'safe':
      case 'low': return '安全';
      case 'warning':
      case 'medium': return '可疑';
      case 'danger':
      case 'high': return '高风险';
      case 'critical': return '极高风险';
      default: return '未知';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe':
      case 'low': return 'safe';
      case 'warning':
      case 'medium': return 'warning';
      case 'danger':
      case 'high':
      case 'critical': return 'danger';
      default: return 'safe';
    }
  };

  // 高亮关键词
  const highlightKeywords = (text: string, keywords: string[] = []) => {
    if (!keywords.length) return text;
    
    let result = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      result = result.replace(regex, '<mark class="bg-red-200 text-red-800 px-1 rounded">$1</mark>');
    });
    return result;
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${Math.floor(milliseconds / 100)}s`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <ScrollReveal>
        <div className="content-header">
          <h1 className="page-title">智能检测</h1>
          <p className="page-subtitle">AI 驱动的多模态反诈检测，支持文本、图片、音频分析</p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：输入区域 */}
        <div className="card">
          {/* 模态选择标签 */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setResult(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white shadow-md text-sky-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 文本输入 */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="请粘贴可疑的聊天记录、短信内容或其他文本..."
                className="input min-h-[220px] resize-none"
                disabled={isAnalyzing}
              />
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{textInput.length} 字符</span>
                <span className="flex items-center gap-1">
                  <CpuChipIcon className="w-4 h-4" />
                  AI 大模型分析
                </span>
              </div>
            </div>
          )}

          {/* 图片上传 */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={imagePreview}
                    alt="预览"
                    className="w-full h-64 object-contain"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-all"
                >
                  <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-700 font-medium">点击或拖拽上传图片</p>
                  <p className="text-sm text-slate-500 mt-2">支持聊天截图、转账截图等</p>
                </div>
              )}
            </div>
          )}

          {/* 音频上传 */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioSelect}
                className="hidden"
              />
              
              {audioFile ? (
                <div className="p-6 bg-slate-100 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center">
                      <MicrophoneIcon className="w-8 h-8 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{audioFile.name}</p>
                      <p className="text-sm text-slate-500">
                        {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={clearAudio}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-all"
                >
                  <MicrophoneIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-700 font-medium">点击上传音频文件</p>
                  <p className="text-sm text-slate-500 mt-2">支持语音消息、通话录音（可检测AI合成语音）</p>
                </div>
              )}
            </div>
          )}

          {/* 分析按钮 */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze() || isAnalyzing}
            className={`btn btn-primary w-full mt-6 py-4 text-base ${
              (!canAnalyze() || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span>{stageLabels[analysisStage]}</span>
                <span className="text-white/70">{formatTime(elapsedTime)}</span>
              </div>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                开始 AI 分析
              </>
            )}
          </button>

          {/* 进度条 */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sky-500 to-sky-600"
                    initial={{ width: '0%' }}
                    animate={{ width: `${stageProgress[analysisStage]}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>数据准备</span>
                  <span>模型分析</span>
                  <span>推理生成</span>
                  <span>完成</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 右侧：结果区域 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-sky-500" />
            分析结果
          </h2>
          
          {isAnalyzing ? (
            <div className="space-y-6">
              {/* 分析动画 */}
              <div className="text-center py-8">
                <motion.div
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-sky-100 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <CpuChipIcon className="w-10 h-10 text-sky-600" />
                </motion.div>
                <p className="text-slate-600 font-medium">{stageLabels[analysisStage]}</p>
                <p className="text-sm text-slate-400 mt-1">耗时: {formatTime(elapsedTime)}</p>
              </div>
              
              {/* 骨架屏 */}
              <div className="space-y-4">
                <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ) : result ? (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* 风险等级 - 醒目展示 */}
              <div className={`text-center p-6 rounded-2xl ${
                getRiskColor(result.risk_level) === 'danger' 
                  ? 'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200'
                  : getRiskColor(result.risk_level) === 'warning'
                  ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-200'
                  : 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200'
              }`}>
                <div className={`risk-orb risk-orb-${getRiskColor(result.risk_level)} mx-auto mb-4`}>
                  <span className="risk-orb-value">{Math.round(result.risk_score * 100)}</span>
                </div>
                <span className={`status-badge status-${getRiskColor(result.risk_level)} text-base px-4 py-2`}>
                  {getRiskLabel(result.risk_level)}
                </span>
                {result.fraud_type_label && (
                  <p className="mt-3 text-slate-700 font-semibold text-lg">{result.fraud_type_label}</p>
                )}
                <p className="text-sm text-slate-500 mt-2">
                  响应时间: {result.response_time_ms}ms
                </p>
              </div>

              {/* AI 分析详情 */}
              {result.analysis && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                    <CpuChipIcon className="w-5 h-5 text-sky-500" />
                    AI 分析结论
                  </h3>
                  <p 
                    className="text-slate-600 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: highlightKeywords(
                        result.analysis,
                        result.cot_reasoning?.keywords || []
                      )
                    }}
                  />
                </div>
              )}

              {/* CoT 推理链 */}
              {result.cot_reasoning?.reasoning_chain && result.cot_reasoning.reasoning_chain.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    思维链推理
                  </h3>
                  <div className="space-y-2">
                    {result.cot_reasoning.reasoning_chain.map((step, idx) => (
                      <motion.div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-slate-600 text-sm">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 风险因素 */}
              {result.cot_reasoning?.risk_factors && result.cot_reasoning.risk_factors.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                    风险因素
                  </h3>
                  <ul className="space-y-2">
                    {result.cot_reasoning.risk_factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 关键词标签 */}
              {result.cot_reasoning?.keywords && result.cot_reasoning.keywords.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3">检测到的诈骗关键词</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.cot_reasoning.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium border border-red-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 安全建议 */}
              {result.suggestions.length > 0 && (
                <div className={`p-4 rounded-xl ${
                  getRiskColor(result.risk_level) === 'danger' 
                    ? 'bg-red-50 border border-red-200'
                    : getRiskColor(result.risk_level) === 'warning'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                    安全建议
                  </h3>
                  <ul className="space-y-2">
                    {result.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 相似案例 */}
              {result.matched_cases.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                    相似诈骗案例
                  </h3>
                  <div className="space-y-2">
                    {result.matched_cases.slice(0, 3).map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between"
                      >
                        <span className="text-slate-700 text-sm">{c.title}</span>
                        <span className="text-xs text-blue-600 font-medium">
                          相似度 {Math.round(c.similarity * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <ShieldCheckIcon className="w-20 h-20 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 text-lg">请输入内容后点击分析</p>
              <p className="text-slate-400 text-sm mt-2">支持文本、图片、音频多模态检测</p>
            </div>
          )}
        </div>
      </div>

      {/* 高风险警告弹窗 */}
      {result && (
        <RiskWarningModal
          isOpen={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          riskLevel={result.risk_level === 'high' || result.risk_level === 'danger' ? 'high' : 'medium'}
          riskScore={result.risk_score}
          fraudType={result.fraud_type || ''}
          fraudTypeLabel={result.fraud_type_label}
          analysis={result.analysis}
          warningScripts={result.warning_scripts}
          suggestions={result.suggestions}
          protectionActions={generateProtectionActions(result.risk_level, result.alert_actions)}
          keywords={result.cot_reasoning?.keywords || []}
        />
      )}
    </div>
  );
}
