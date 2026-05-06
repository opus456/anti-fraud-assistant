import { useState } from 'react';
import { Shield, Smartphone, RefreshCw, Lock, Scan, AlertTriangle, MessageSquareText, Loader2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { isSmsBridgeAvailable, readSmsInbox, requestSmsPermission, type SmsMessage } from '../services/smsBridge';

interface SmsScanResult {
  message: SmsMessage;
  risk_score: number;
  risk_level: string;
  fraud_type_label: string;
  is_fraud: boolean;
  analysis: string;
}

export default function SmsInbox() {
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [results, setResults] = useState<SmsScanResult[]>([]);

  const platformSupported = isSmsBridgeAvailable();

  const handleGrantPermission = async () => {
    if (!platformSupported) {
      toast.error('短信读取仅支持 Android 设备');
      return;
    }

    setLoading(true);
    try {
      const granted = await requestSmsPermission();
      setPermissionGranted(granted);
      if (granted) {
        toast.success('短信权限已授权');
      } else {
        toast.error('未获得短信权限');
      }
    } catch (error: any) {
      toast.error(error.message || '申请权限失败');
    } finally {
      setLoading(false);
    }
  };

  const handleScanInbox = async () => {
    if (!platformSupported) {
      toast.error('短信读取仅支持 Android 设备');
      return;
    }

    setLoading(true);
    try {
      const granted = permissionGranted || (await requestSmsPermission());
      setPermissionGranted(granted);

      if (!granted) {
        toast.error('请先授予短信读取权限');
        return;
      }

      const inbox = await readSmsInbox(limit);
      setMessages(inbox);

      const scanResults: SmsScanResult[] = [];
      for (const sms of inbox) {
        const payload = [
          `发件人: ${sms.address || '未知'}`,
          `时间: ${new Date(sms.date).toLocaleString()}`,
          `内容: ${sms.body}`,
        ].join('\n');

        const { data } = await api.post('/detection/text', {
          content: payload,
          context: 'mobile_sms_inbox',
        });

        scanResults.push({
          message: sms,
          risk_score: data.risk_score ?? 0,
          risk_level: data.risk_level ?? 'low',
          fraud_type_label: data.fraud_type_label ?? '未知',
          is_fraud: Boolean(data.is_fraud),
          analysis: data.analysis ?? '',
        });
      }

      setResults(scanResults);
      toast.success(`已扫描 ${scanResults.length} 条短信`);
    } catch (error: any) {
      toast.error(error.message || '扫描短信失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 text-white shadow-2xl shadow-slate-900/30">
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sm">
                <Smartphone className="w-4 h-4" />
                手机短信检测
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">读取 Android 短信并自动检测诈骗风险</h1>
              <p className="text-white/75 text-sm sm:text-base leading-7">
                该页面在移动端读取本机短信收件箱，并把每条短信送入现有反诈检测引擎。iPhone 不支持系统级短信读取，只能手动粘贴内容检测。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[240px]">
              <div className="rounded-2xl bg-white/10 border border-slate-200 p-4 backdrop-blur">
                <div className="text-xs text-white/60">平台</div>
                <div className="mt-1 font-semibold">{platformSupported ? 'Android' : 'Web / iOS'}</div>
              </div>
              <div className="rounded-2xl bg-white/10 border border-slate-200 p-4 backdrop-blur">
                <div className="text-xs text-white/60">权限</div>
                <div className="mt-1 font-semibold">{permissionGranted ? '已授权' : '未授权'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="card p-6 space-y-5 sticky top-6 self-start">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              读取设置
            </h2>
            <p className="text-sm text-slate-500 mt-1">先获取短信权限，再扫描本机收件箱。</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">扫描条数</label>
            <input
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 30)}
              className="input"
            />
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-500 space-y-2">
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <Lock className="w-4 h-4 text-warning-600" />
              权限说明
            </div>
            <p>仅在 Android 原生壳中可读取短信；浏览器和 iPhone 不会暴露系统短信收件箱。</p>
          </div>

          <div className="grid gap-3">
            <button
              onClick={handleGrantPermission}
              disabled={loading || !platformSupported}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              申请短信权限
            </button>
            <button
              onClick={handleScanInbox}
              disabled={loading || !platformSupported}
              className="btn-safe flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
              扫描短信并检测
            </button>
            <button
              onClick={handleScanInbox}
              disabled={loading || !platformSupported}
              className="btn-ghost flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              重新扫描
            </button>
          </div>

          {!platformSupported && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              当前环境不是 Android 原生 App，无法直接读取短信。你仍然可以把短信内容手动粘贴到“智能检测”页面。
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="text-sm text-slate-500">已读取短信</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{messages.length}</div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500">高风险短信</div>
              <div className="mt-2 text-3xl font-black text-danger-600">
                {results.filter((item) => item.is_fraud || item.risk_score >= 0.7).length}
              </div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500">中低风险短信</div>
              <div className="mt-2 text-3xl font-black text-warning-600">
                {results.filter((item) => !item.is_fraud && item.risk_score < 0.7).length}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquareText className="w-5 h-5 text-primary-600" />
                  最近扫描结果
                </h2>
                <p className="text-sm text-slate-500 mt-1">按短信顺序扫描并展示风险摘要。</p>
              </div>
            </div>

            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                  还没有扫描结果。先申请权限，再执行扫描。
                </div>
              ) : (
                results.map((item) => (
                  <div
                    key={item.message.id}
                    className={`rounded-2xl border p-4 sm:p-5 ${item.is_fraud || item.risk_score >= 0.7 ? 'border-danger-200 bg-danger-50' : item.risk_score >= 0.4 ? 'border-warning-200 bg-warning-50' : 'border-safe-200 bg-safe-50'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span className="font-semibold text-slate-900">{item.message.address || '未知号码'}</span>
                          <span>·</span>
                          <span>{new Date(item.message.date).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-6">{item.message.body}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-slate-500">风险评分</div>
                        <div className="text-xl font-black text-slate-900">{Math.round(item.risk_score * 100)}%</div>
                        <div className="text-xs font-medium text-slate-500 mt-1">{item.fraud_type_label}</div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl bg-white/80 border border-white/70 p-4 text-sm text-slate-700">
                      {item.analysis || '未返回详细分析'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}