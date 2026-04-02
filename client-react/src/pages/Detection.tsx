import { useRef, useCallback } from 'react';
import { 
  Upload, X, AlertTriangle, ShieldCheck, Brain, Lightbulb, BookOpen,
  Scan, Database, Cpu, CheckCircle2, Clock, Zap, ChevronRight, Shield
} from 'lucide-react';
import api from '../api';
import { useDetectionStore, type DetectionResult, type CotReasoning, type DetectionStage } from '../store';
import toast from 'react-hot-toast';

const exampleTexts = [
  { text: '恭喜您中了100万大奖！请点击链接领取：http://fake-link.com，需先缴纳5000元手续费。', tag: '中奖诈骗' },
  { text: '您好，我是公安局的，您的银行账户涉嫌洗钱，请立即将资金转入安全账户。', tag: '冒充公检法' },
  { text: '您的快递丢失了，我们将赔偿您300元，请提供您的银行卡号和验证码。', tag: '快递理赔' },
  { text: '我是你领导，我换号了，明天有个急事需要你先转5万块钱到这个账户。', tag: '冒充领导' },
  { text: '您好，您的社保卡异常，需要远程协助处理，请下载以下APP进行操作。', tag: '社保诈骗' },
];

const cotLabels: Record<keyof CotReasoning, { label: string; icon: string }> = {
  urgency_check: { label: '紧迫性分析', icon: '⏰' },
  financial_check: { label: '资金要求分析', icon: '💰' },
  authority_fake_check: { label: '身份伪造分析', icon: '🎭' },
  info_theft_check: { label: '信息窃取分析', icon: '🔐' },
  too_good_check: { label: '利益诱惑分析', icon: '🎁' },
  risk_level: { label: '风险等级', icon: '⚠️' },
  scam_type: { label: '诈骗类型', icon: '🏷️' },
};

const stageConfig: Record<DetectionStage, { label: string; icon: typeof Scan; color: string }> = {
  idle: { label: '等待检测', icon: Shield, color: 'text-slate-400' },
  keyword: { label: '关键词规则扫描', icon: Scan, color: 'text-blue-500' },
  rag: { label: 'RAG 知识库检索', icon: Database, color: 'text-purple-500' },
  llm: { label: 'AI 深度语义分析', icon: Cpu, color: 'text-orange-500' },
  fusion: { label: '多源信息融合', icon: Zap, color: 'text-cyan-500' },
  complete: { label: '检测完成', icon: CheckCircle2, color: 'text-safe-500' },
  error: { label: '检测失败', icon: AlertTriangle, color: 'text-danger-500' },
};

function formatMatchedCase(
  item: string | { title?: string; content?: string; similarity?: number }
): { title: string; content: string; similarity: number } {
  if (typeof item === 'string') {
    return { title: '相关案例', content: item, similarity: 0 };
  }
  return {
    title: item.title || '相关案例',
    content: item.content || '',
    similarity: item.similarity || 0,
  };
}

// 风险仪表盘组件
function RiskGauge({ score, isAnimating }: { score: number; isAnimating?: boolean }) {
  const percentage = Math.round(score * 100);
  const color = percentage >= 70 ? '#ef4444' : percentage >= 40 ? '#f59e0b' : '#10b981';
  const bgColor = percentage >= 70 ? 'bg-danger-50' : percentage >= 40 ? 'bg-warning-50' : 'bg-safe-50';
  const borderColor = percentage >= 70 ? 'border-danger-200' : percentage >= 40 ? 'border-warning-200' : 'border-safe-200';
  
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={`relative inline-flex items-center justify-center p-6 rounded-2xl ${bgColor} border ${borderColor}`}>
      <svg width="140" height="140" viewBox="0 0 140 140" className={isAnimating ? 'animate-pulse' : ''}>
        {/* 背景圆环 */}
        <circle cx="70" cy="70" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
        {/* 进度圆环 */}
        <circle 
          cx="70" cy="70" r="54" 
          fill="none" 
          stroke={color} 
          strokeWidth="12"
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round"
          transform="rotate(-90 70 70)" 
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
        {/* 中心文字 */}
        <text x="70" y="62" textAnchor="middle" className="text-3xl font-bold" fill={color}>
          {percentage}
        </text>
        <text x="70" y="82" textAnchor="middle" className="text-xs font-medium" fill="#6b7280">
          风险评分
        </text>
      </svg>
    </div>
  );
}

// 检测进度组件
function DetectionProgress() {
  const { progress, isDetecting } = useDetectionStore();
  const config = stageConfig[progress.stage];
  const Icon = config.icon;
  
  const stages: DetectionStage[] = ['keyword', 'rag', 'llm', 'fusion'];
  const currentIndex = stages.indexOf(progress.stage);
  
  if (!isDetecting && progress.stage === 'idle') return null;
  
  return (
    <div className="bg-gradient-to-r from-primary-900 to-primary-800 rounded-2xl p-6 text-white overflow-hidden relative">
      {/* 背景动画 */}
      <div className="absolute inset-0 bg-grid-dark opacity-30" />
      {isDetecting && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-scan-line" />
        </div>
      )}
      
      <div className="relative z-10">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${isDetecting ? 'animate-pulse' : ''}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <h3 className="font-semibold">{config.label}</h3>
              <p className="text-sm text-primary-300">{progress.message}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{progress.percent}%</div>
            {isDetecting && progress.startTime > 0 && (
              <div className="text-xs text-primary-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {((Date.now() - progress.startTime) / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        
        {/* 阶段指示器 */}
        <div className="flex justify-between">
          {stages.map((stage, index) => {
            const stageConf = stageConfig[stage];
            const StageIcon = stageConf.icon;
            const isActive = index === currentIndex;
            const isComplete = index < currentIndex || progress.stage === 'complete';
            
            return (
              <div key={stage} className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                  ${isComplete ? 'bg-safe-500' : isActive ? 'bg-accent-500 animate-pulse' : 'bg-white/10'}
                `}>
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <StageIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/50'}`} />
                  )}
                </div>
                <span className={`text-xs mt-2 ${isActive || isComplete ? 'text-white' : 'text-white/50'}`}>
                  {stageConf.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* 实时日志 */}
        {progress.logs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="text-xs text-primary-400 mb-2">检测日志</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {progress.logs.slice(-5).map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-primary-500">[{new Date(log.time).toLocaleTimeString()}]</span>
                  <span className="text-primary-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Detection() {
  const {
    inputText, inputImage, imagePreview, multimodal, isDetecting, result,
    setInputText, setInputImage, setMultimodal,
    startDetection, updateProgress, setResult, setError,
  } = useDetectionStore();
  
  const fileRef = useRef<HTMLInputElement>(null);

  // 模拟进度更新（实际应该从后端WebSocket获取）
  const simulateProgress = useCallback(async () => {
    const stages: Array<{ stage: DetectionStage; message: string; percent: number; delay: number }> = [
      { stage: 'keyword', message: '扫描敏感词汇和风险模式...', percent: 25, delay: 500 },
      { stage: 'rag', message: '检索相似诈骗案例...', percent: 50, delay: 800 },
      { stage: 'llm', message: 'AI 模型深度分析中...', percent: 75, delay: 1000 },
      { stage: 'fusion', message: '综合各项指标评估风险...', percent: 90, delay: 500 },
    ];
    
    for (const s of stages) {
      await new Promise(r => setTimeout(r, s.delay));
      if (useDetectionStore.getState().isDetecting) {
        updateProgress(s.stage, s.message, s.percent);
      }
    }
  }, [updateProgress]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 释放之前的 Object URL 以防止内存泄漏
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setInputImage(file, URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    // 释放 Object URL 以防止内存泄漏
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setInputImage(null, '');
    if (fileRef.current) fileRef.current.value = '';
  };

  // 将文件转为 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // 移除 data:image/xxx;base64, 前缀，只保留纯 base64
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleDetect = async () => {
    if (!inputText.trim() && !inputImage) {
      toast.error('请输入文本或上传图片');
      return;
    }
    
    startDetection();
    
    // 启动进度模拟
    simulateProgress();
    
    try {
      let data: DetectionResult;
      if (multimodal && inputImage) {
        // 将图片转为 base64 后发送 JSON
        const imageBase64 = await fileToBase64(inputImage);
        const res = await api.post('/detection/multimodal', {
          text: inputText,
          image_frame: imageBase64,
          image_ocr: '',
          audio_transcript: '',
          video_description: '',
          context: '',
        });
        data = res.data;
      } else {
        const res = await api.post('/detection/text', { content: inputText });
        data = res.data;
      }
      setResult(data);
      
      if (data.is_fraud) {
        toast.error('⚠️ 检测到诈骗风险！', { duration: 5000 });
      } else {
        toast.success('✅ 未检测到明显风险');
      }
    } catch (err: any) {
      setError(err.message || '检测失败');
      toast.error(err.message || '检测失败');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
              <Scan className="w-5 h-5 text-white" />
            </div>
            智能诈骗检测
          </h1>
          <p className="text-gray-500 mt-1 ml-13">AI 多维度分析，精准识别诈骗风险</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左侧输入区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 输入卡片 */}
          <div className="card p-6 space-y-5">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              placeholder="粘贴或输入可疑信息内容进行检测...&#10;&#10;例如：短信、微信消息、电话内容、网页文字等"
              className="input resize-none text-base leading-relaxed"
              disabled={isDetecting}
            />

            {/* 多模态切换和图片上传 */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={multimodal} 
                  onChange={(e) => setMultimodal(e.target.checked)}
                  disabled={isDetecting}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <span className="text-gray-700">多模态检测（图文）</span>
              </label>
              
              {multimodal && (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => fileRef.current?.click()}
                    disabled={isDetecting}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" /> 上传图片
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  {imagePreview && (
                    <div className="relative">
                      <img src={imagePreview} alt="preview" className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                      <button 
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-danger-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 检测按钮 */}
            <button 
              onClick={handleDetect} 
              disabled={isDetecting}
              className="w-full py-4 bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 
                       text-white rounded-xl font-semibold flex items-center justify-center gap-3
                       shadow-lg shadow-danger-500/25 hover:shadow-xl hover:shadow-danger-500/30
                       transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isDetecting ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  检测中...
                </>
              ) : (
                <>
                  <Scan className="w-6 h-6" />
                  开始检测
                </>
              )}
            </button>
          </div>

          {/* 检测进度 */}
          <DetectionProgress />

          {/* 检测结果 */}
          {result && (
            <div className="card p-6 space-y-6 animate-slide-up">
              {/* 结果头部 */}
              <div className="flex items-start gap-6">
                <RiskGauge score={result.risk_score} />
                <div className="flex-1">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
                    result.is_fraud 
                      ? 'bg-danger-100 text-danger-700 border border-danger-200' 
                      : 'bg-safe-100 text-safe-700 border border-safe-200'
                  }`}>
                    {result.is_fraud ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    {result.is_fraud ? '⚠️ 疑似诈骗' : '✅ 暂未发现风险'}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">风险等级：</span>
                      <span className={`font-semibold ${
                        result.risk_level === 'critical' ? 'text-danger-600' :
                        result.risk_level === 'high' ? 'text-danger-500' :
                        result.risk_level === 'medium' ? 'text-warning-600' : 'text-safe-600'
                      }`}>
                        {result.risk_level === 'critical' ? '极高风险' :
                         result.risk_level === 'high' ? '高风险' :
                         result.risk_level === 'medium' ? '中等风险' : '低风险'}
                      </span>
                    </div>
                    {result.fraud_type_label && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">诈骗类型：</span>
                        <span className="font-semibold text-gray-900">{result.fraud_type_label}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">响应时间：</span>
                      <span className="font-medium text-gray-700">{result.response_time_ms}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 安全警告 */}
              {result.warning_scripts?.length > 0 && (
                <div className="bg-gradient-to-r from-danger-50 to-danger-100/50 border border-danger-200 rounded-xl p-5">
                  <h3 className="font-bold text-danger-700 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" /> 安全警告
                  </h3>
                  <div className="space-y-2">
                    {result.warning_scripts.map((w, i) => (
                      <p key={i} className="text-danger-600 text-sm leading-relaxed">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* CoT 推理过程 */}
              {result.cot_reasoning && (
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-purple-600" /> AI 分析过程
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(Object.keys(cotLabels) as (keyof CotReasoning)[]).map((key) => {
                      const val = result.cot_reasoning?.[key];
                      if (!val) return null;
                      const config = cotLabels[key];
                      return (
                        <div key={key} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <span>{config.icon}</span>
                            <span>{config.label}</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{val}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 分析详情 */}
              {result.analysis && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">分析详情</h3>
                  <p className="text-gray-700 leading-relaxed bg-slate-50 rounded-xl p-4 text-sm">
                    {result.analysis}
                  </p>
                </div>
              )}

              {/* 检测过程说明 */}
              {result.pipeline && (
                <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
                  <h3 className="font-semibold text-primary-800 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> 检测管道详情
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-primary-600 font-medium">关键词评分</div>
                      <div className="text-2xl font-bold text-primary-800">
                        {Math.round((result.pipeline.keyword_score || 0) * 100)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-primary-600 font-medium">RAG 相似度</div>
                      <div className="text-2xl font-bold text-primary-800">
                        {Math.round((result.pipeline.rag_similarity || 0) * 100)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-primary-600 font-medium">LLM 状态</div>
                      <div className="text-lg font-bold text-primary-800">
                        {result.pipeline.llm_used ? '✅ 已启用' : '⏭️ 跳过'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary-200 text-xs text-primary-600">
                    耗时明细：规则 {result.pipeline.timings_ms?.keyword_ms ?? 0}ms →
                    RAG {result.pipeline.timings_ms?.rag_ms ?? 0}ms →
                    LLM {result.pipeline.timings_ms?.llm_ms ?? 0}ms →
                    融合 {result.pipeline.timings_ms?.fusion_ms ?? 0}ms
                  </div>
                </div>
              )}

              {/* 建议措施 */}
              {result.suggestions?.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <h3 className="font-bold text-blue-700 flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5" /> 建议措施
                  </h3>
                  <ul className="space-y-2">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-600">
                        <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 匹配案例 */}
              {result.matched_cases?.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-amber-600" /> 相似案例参考
                  </h3>
                  <div className="space-y-3">
                    {result.matched_cases.map((c, i) => {
                      const caseData = formatMatchedCase(c);
                      return (
                        <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-amber-800">{caseData.title}</span>
                            {caseData.similarity > 0 && (
                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                相似度 {(caseData.similarity * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-amber-700 leading-relaxed">{caseData.content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧示例区域 */}
        <div className="space-y-6">
          {/* 示例文本 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              典型诈骗示例
            </h3>
            <div className="space-y-2">
              {exampleTexts.map((ex, i) => (
                <button 
                  key={i} 
                  onClick={() => setInputText(ex.text)}
                  disabled={isDetecting}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/50 
                           transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-danger-100 text-danger-700 px-2 py-0.5 rounded-full font-medium">
                      {ex.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 group-hover:text-gray-900 transition-colors">
                    {ex.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
          
          {/* 安全提示 */}
          <div className="card p-5 bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200">
            <h3 className="font-semibold text-primary-800 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              安全小贴士
            </h3>
            <ul className="space-y-2 text-sm text-primary-700">
              <li className="flex items-start gap-2">
                <span className="text-danger-500">•</span>
                公检法不会通过电话办案
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger-500">•</span>
                不向陌生人转账汇款
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger-500">•</span>
                不点击来历不明的链接
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger-500">•</span>
                不透露银行卡密码验证码
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-primary-200 text-center">
              <p className="text-xs text-primary-600">全国反诈热线</p>
              <p className="text-2xl font-bold text-danger-600 mt-1">96110</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
