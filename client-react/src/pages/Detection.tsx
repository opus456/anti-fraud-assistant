import { useState, useRef, useEffect } from 'react';
import { Search, Upload, X, Loader2, AlertTriangle, ShieldCheck, Brain, Lightbulb, BookOpen } from 'lucide-react';
import api from '../api';
import type { DetectionResult, CotReasoning } from '../store';
import toast from 'react-hot-toast';

const exampleTexts = [
  '恭喜您中了100万大奖！请点击链接领取：http://fake-link.com，需先缴纳5000元手续费。',
  '您好，我是公安局的，您的银行账户涉嫌洗钱，请立即将资金转入安全账户。',
  '您的快递丢失了，我们将赔偿您300元，请提供您的银行卡号和验证码。',
  '我是你领导，我换号了，明天有个急事需要你先转5万块钱到这个账户。',
  '您好，您的社保卡异常，需要远程协助处理，请下载以下APP进行操作。',
];

const cotLabels: Record<keyof CotReasoning, string> = {
  urgency_check: '紧迫性检查',
  financial_check: '资金要求检查',
  authority_fake_check: '冒充权威检查',
  info_theft_check: '信息窃取检查',
  too_good_check: '利益诱惑检查',
  risk_level: '风险等级',
  scam_type: '诈骗类型',
};

function formatMatchedCase(
  item: string | { title?: string; content?: string; similarity?: number }
): string {
  if (typeof item === 'string') return item;

  const title = item.title?.trim();
  const content = item.content?.trim();
  const similarity = typeof item.similarity === 'number'
    ? ` (相似度 ${(item.similarity * 100).toFixed(1)}%)`
    : '';

  if (title && content) return `${title}${similarity}：${content}`;
  if (title) return `${title}${similarity}`;
  if (content) return `${content}${similarity}`;
  return '匹配到疑似相关案例';
}

function RiskRing({ score }: { score: number }) {
  const r = 45, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e';
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 60 60)" className="transition-all duration-1000" />
      <text x="60" y="55" textAnchor="middle" className="text-2xl font-bold" fill={color}>{score}</text>
      <text x="60" y="72" textAnchor="middle" className="text-xs" fill="#6b7280">风险评分</text>
    </svg>
  );
}

const loadingSteps = [
  '步骤 1/3：关键词规则扫描中...',
  '步骤 2/3：RAG 相似案例检索中...',
  '步骤 3/3：LLM 语义推理中（按需触发）...',
];

export default function Detection() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [multimodal, setMultimodal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) return;

    const timer = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % loadingSteps.length);
    }, 1400);

    return () => clearInterval(timer);
  }, [loading]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDetect = async () => {
    if (!text.trim() && !image) {
      toast.error('请输入文本或上传图片');
      return;
    }
    setLoading(true);
    setLoadingStepIndex(0);
    setResult(null);
    try {
      let data: DetectionResult;
      if (multimodal && image) {
        const fd = new FormData();
        fd.append('text', text);
        fd.append('image', image);
        const res = await api.post('/detection/multimodal', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        data = res.data;
      } else {
        const res = await api.post('/detection/text', { content: text });
        data = res.data;
      }
      setResult(data);
    } catch (err: any) {
      toast.error(err.message || '检测失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Search className="w-6 h-6 text-primary-600" /> 智能诈骗检测
      </h1>

      {/* Input area */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="粘贴或输入可疑信息内容进行检测..."
          className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
        />

        {/* Multimodal toggle + image upload */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={multimodal} onChange={(e) => setMultimodal(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded" />
            多模态检测（图文）
          </label>
          {multimodal && (
            <div className="flex items-center gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg flex items-center gap-1 hover:bg-gray-50">
                <Upload className="w-4 h-4" /> 上传图片
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {imagePreview && (
                <div className="relative w-12 h-12">
                  <img src={imagePreview} alt="preview" className="w-12 h-12 object-cover rounded-lg" />
                  <button onClick={removeImage} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleDetect} disabled={loading}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          {loading ? '检测中...' : '开始检测'}
        </button>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 font-medium">{loadingSteps[loadingStepIndex]}</p>
            <p className="text-xs text-blue-600 mt-1">检测耗时受文本长度、案例检索和 LLM 触发影响，属于正常现象。</p>
          </div>
        )}
      </div>

      {/* Example texts */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-sm font-medium text-gray-600 mb-3">示例文本（点击使用）：</h3>
        <div className="space-y-2">
          {exampleTexts.map((ex, i) => (
            <button key={i} onClick={() => setText(ex)}
              className="block w-full text-left text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-colors truncate">
              {i + 1}. {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* Header with risk ring */}
          <div className="flex items-center gap-6">
            <RiskRing score={Math.round(result.risk_score * 100)} />
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                result.is_fraud ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {result.is_fraud ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                {result.is_fraud ? '疑似诈骗' : '暂未发现风险'}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                风险等级: <span className="font-medium">{result.risk_level}</span> | 类型: <span className="font-medium">{result.fraud_type_label}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">响应时间: {result.response_time_ms}ms</p>
            </div>
          </div>

          {/* CoT Reasoning */}
          {result.cot_reasoning && (
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-purple-600" /> 链式推理过程
              </h3>
              <div className="space-y-2">
                {(Object.keys(cotLabels) as (keyof CotReasoning)[]).map((key) => {
                  const val = result.cot_reasoning?.[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">{cotLabels[key]}</p>
                      <p className="text-sm text-gray-700">{val}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analysis */}
          {result.analysis && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">分析详情</h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">{result.analysis}</p>
            </div>
          )}

          {result.pipeline && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">检测过程说明</h3>
              <p className="text-sm text-gray-600">
                关键词分值 {Math.round((result.pipeline.keyword_score || 0) * 100)}，
                RAG 相似度 {Math.round((result.pipeline.rag_similarity || 0) * 100)}，
                LLM {result.pipeline.llm_used ? '已触发' : '未触发'}。
              </p>
              <p className="text-xs text-gray-500 mt-1">
                耗时明细：规则 {result.pipeline.timings_ms?.keyword_ms ?? 0}ms，
                RAG {result.pipeline.timings_ms?.rag_ms ?? 0}ms，
                LLM {result.pipeline.timings_ms?.llm_ms ?? 0}ms，
                融合 {result.pipeline.timings_ms?.fusion_ms ?? 0}ms。
              </p>
            </div>
          )}

          {/* Warnings */}
          {result.warning_scripts?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> 安全警告
              </h3>
              {result.warning_scripts.map((w, i) => (
                <p key={i} className="text-sm text-red-600 mb-1">{w}</p>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4" /> 建议措施
              </h3>
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-blue-600">{i + 1}. {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Matched cases */}
          {result.matched_cases?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4" /> 匹配案例
              </h3>
              <ul className="space-y-1">
                {result.matched_cases.map((c, i) => (
                  <li key={i} className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {formatMatchedCase(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
