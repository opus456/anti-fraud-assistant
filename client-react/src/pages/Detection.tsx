import { useState, useCallback, useRef } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

type ModalityTab = 'text' | 'image' | 'audio';

interface AnalysisResult {
  riskLevel: 'safe' | 'warning' | 'danger';
  riskScore: number;
  scamType?: string;
  summary: string;
  details: string[];
  suggestions: string[];
}

export default function Detection() {
  const [activeTab, setActiveTab] = useState<ModalityTab>('text');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'text' as ModalityTab, label: '文本检测', icon: ChatBubbleLeftRightIcon },
    { id: 'image' as ModalityTab, label: '图片检测', icon: PhotoIcon },
    { id: 'audio' as ModalityTab, label: '音频检测', icon: MicrophoneIcon },
  ];

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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResult(null);

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟结果
    const mockResult: AnalysisResult = {
      riskLevel: Math.random() > 0.6 ? 'safe' : Math.random() > 0.3 ? 'warning' : 'danger',
      riskScore: Math.floor(Math.random() * 100),
      scamType: ['投资理财诈骗', '兼职刷单诈骗', '虚假征信诈骗', '冒充公检法'][Math.floor(Math.random() * 4)],
      summary: '内容分析完成，请查看详细报告。',
      details: [
        '检测到可疑的投资回报承诺',
        '发现非官方联系方式',
        '存在紧迫性语言诱导',
      ],
      suggestions: [
        '不要轻信高回报投资承诺',
        '通过官方渠道核实信息',
        '如有疑虑请联系家人或报警',
      ],
    };

    setResult(mockResult);
    setIsAnalyzing(false);
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
      case 'safe': return '安全';
      case 'warning': return '可疑';
      case 'danger': return '高风险';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="content-header">
        <h1 className="page-title">智能检测</h1>
        <p className="page-subtitle">支持文本、图片、音频多模态内容分析</p>
      </div>

      <div className="card-grid-2">
        {/* 左侧：输入区域 */}
        <div className="card">
          {/* 模态选择标签 */}
          <div className="flex gap-2 mb-6 p-1 bg-surface-100 rounded-card">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setResult(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-btn font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white shadow-card text-primary-500'
                    : 'text-text-muted hover:text-text-body'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
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
                className="input min-h-[200px] resize-none"
                disabled={isAnalyzing}
              />
              <div className="flex items-center justify-between text-sm text-text-muted">
                <span>{textInput.length} 字符</span>
                <span>支持中英文内容分析</span>
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
                <div className="relative rounded-card overflow-hidden bg-surface-100">
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
                  className="border-2 border-dashed border-surface-300 rounded-card p-12 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all"
                >
                  <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-text-muted mb-4" />
                  <p className="text-text-body font-medium">点击或拖拽上传图片</p>
                  <p className="text-sm text-text-muted mt-2">支持 JPG、PNG、GIF 格式</p>
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
                <div className="p-6 bg-surface-100 rounded-card">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                      <MicrophoneIcon className="w-8 h-8 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-title truncate">{audioFile.name}</p>
                      <p className="text-sm text-text-muted">
                        {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={clearAudio}
                      className="p-2 text-text-muted hover:text-danger-500 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-surface-300 rounded-card p-12 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all"
                >
                  <MicrophoneIcon className="w-12 h-12 mx-auto text-text-muted mb-4" />
                  <p className="text-text-body font-medium">点击上传音频文件</p>
                  <p className="text-sm text-text-muted mt-2">支持 MP3、WAV、M4A 格式</p>
                </div>
              )}
            </div>
          )}

          {/* 分析按钮 */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze() || isAnalyzing}
            className={`btn btn-primary w-full mt-6 ${
              (!canAnalyze() || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isAnalyzing ? (
              <>
                <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                开始分析
              </>
            )}
          </button>
        </div>

        {/* 右侧：结果区域 */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-title mb-6">分析结果</h2>
          
          {isAnalyzing ? (
            <div className="space-y-4">
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-text w-3/4" />
              <div className="skeleton skeleton-text w-1/2" />
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* 风险等级 */}
              <div className="text-center p-6 rounded-card bg-surface-100">
                <div className={`risk-orb risk-orb-${result.riskLevel} mx-auto mb-4`}>
                  <span className="risk-orb-value">{result.riskScore}</span>
                </div>
                <span className={`status-badge status-${result.riskLevel}`}>
                  {getRiskLabel(result.riskLevel)}
                </span>
                {result.scamType && (
                  <p className="mt-3 text-text-body font-medium">{result.scamType}</p>
                )}
              </div>

              {/* 详细信息 */}
              <div>
                <h3 className="font-medium text-text-title mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-primary-500" />
                  分析详情
                </h3>
                <ul className="space-y-2">
                  {result.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-text-body">
                      <ExclamationTriangleIcon className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 建议 */}
              <div>
                <h3 className="font-medium text-text-title mb-3 flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-safe-500" />
                  安全建议
                </h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-text-body">
                      <CheckCircleIcon className="w-5 h-5 text-safe-500 flex-shrink-0 mt-0.5" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShieldCheckIcon className="w-16 h-16 mx-auto text-surface-300 mb-4" />
              <p className="text-text-muted">请输入内容后点击分析</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

