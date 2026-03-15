import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Siren, PhoneCall, BellRing, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

interface AlertItem {
  id: number;
  title: string;
  description: string;
  risk_level: string;
  fraud_type: string | null;
  is_resolved: boolean;
  created_at: string;
}

interface RealtimeEvent {
  id: number;
  event: string;
  timestamp: string;
  payload: Record<string, any>;
}

const RISK_STYLE: Record<string, string> = {
  low: 'bg-yellow-100 text-yellow-800',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900',
  safe: 'bg-green-100 text-green-800',
};

export default function GuardianPortal() {
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const eventId = useRef(0);
  const navigate = useNavigate();

  const loadAlerts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?mode=guardian', { replace: true });
      return;
    }
    try {
      // 使用带尾斜杠的稳定路径，避免重定向链导致鉴权头丢失
      const { data } = await api.get('/alerts/', { params: { unresolved_only: true, page_size: 20 } });
      setAlerts(data || []);
    } catch {
      toast.error('监护端加载预警失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?mode=guardian', { replace: true });
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/realtime/ws/guardian?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      toast.success('监护端实时联动已连接');
    };

    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        const evt: RealtimeEvent = {
          id: ++eventId.current,
          event: data.event || 'unknown',
          timestamp: data.timestamp || new Date().toISOString(),
          payload: data.payload || {},
        };
        setEvents((prev) => [evt, ...prev].slice(0, 30));

        if (evt.event === 'guardian_alert') {
          toast.error('高危诈骗联动告警，请立即联系家人', { duration: 6000 });
          loadAlerts();
        }
      } catch {
        // ignore invalid event
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(timer);
      ws.close();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" /> 返回主系统
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2 flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-red-600" />
              监护端应急门户
            </h1>
            <p className="text-sm text-gray-500 mt-1">面向家属/监护人，实时接收高危诈骗联动告警</p>
          </div>
          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {connected ? <span className="inline-flex items-center gap-1"><Wifi className="w-4 h-4" /> 实时已连接</span> : <span className="inline-flex items-center gap-1"><WifiOff className="w-4 h-4" /> 连接中断</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">未处理预警</div>
            <div className="text-3xl font-bold text-red-600 mt-1">{alerts.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">实时事件</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{events.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">应急动作</div>
            <div className="text-sm font-medium text-gray-700 mt-2">电话核实 / 远程提醒 / 协助报警</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Siren className="w-5 h-5 text-red-600" />
              未处理预警
            </h2>
            <div className="mt-4 space-y-3 max-h-[480px] overflow-auto pr-1">
              {loading ? (
                <p className="text-sm text-gray-400">加载中...</p>
              ) : alerts.length === 0 ? (
                <p className="text-sm text-gray-400">暂无未处理预警</p>
              ) : alerts.map((a) => (
                <div key={a.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-800">{a.title}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${RISK_STYLE[a.risk_level] || RISK_STYLE.safe}`}>
                      {a.risk_level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{a.description || '系统已触发高风险联动告警。'}</p>
                  <div className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleString()}</div>
                  <div className="mt-3">
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700">
                      <PhoneCall className="w-3.5 h-3.5" /> 立即联系家人
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-blue-600" />
              实时联动事件流
            </h2>
            <div className="mt-4 space-y-3 max-h-[480px] overflow-auto pr-1">
              {events.length === 0 ? (
                <p className="text-sm text-gray-400">暂无实时事件</p>
              ) : events.map((e) => (
                <div key={e.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="text-sm font-medium text-gray-800">{e.event}</div>
                  {e.payload?.message && <div className="text-xs text-gray-600 mt-1">{e.payload.message}</div>}
                  <div className="text-xs text-gray-400 mt-2">{new Date(e.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
