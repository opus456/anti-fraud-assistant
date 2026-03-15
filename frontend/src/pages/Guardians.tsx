/**
 * 守护者管理页面
 */
import { useState, useEffect, useRef } from 'react';
import { Shield, Plus, Trash2, Phone, Mail, Star, Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

interface Guardian {
  id: number;
  name: string;
  phone: string;
  email: string;
  relationship_type: string;
  is_primary: boolean;
  created_at: string;
}

interface RealtimeEvent {
  id: number;
  event: string;
  timestamp: string;
  payload: Record<string, any>;
}

const relationships = ['父母', '子女', '配偶', '兄弟姐妹', '朋友', '社区工作者', '其他'];

export default function Guardians() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', relationship_type: '子女', is_primary: false });
  const [wsConnected, setWsConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const eventId = useRef(0);

  const load = async () => {
    try {
      const { data } = await api.get('/guardians/');
      setGuardians(data);
    } catch {
      toast.error('加载守护人失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/api/realtime/ws/guardian?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      toast.success('监护联动实时通道已连接');
    };

    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        setEvents((prev) => ([{
          id: ++eventId.current,
          event: data.event || 'unknown',
          timestamp: data.timestamp || new Date().toISOString(),
          payload: data.payload || {},
        }, ...prev]).slice(0, 20));

        if (data.event === 'guardian_alert') {
          toast.error('收到高危联动告警，请立即联系家人核实', { duration: 6000 });
        }
      } catch {
        // ignore malformed message
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
  }, []);

  const handleAdd = async () => {
    if (!form.name || !form.phone) return toast.error('请填写姓名和电话');
    try {
      await api.post('/guardians/', form);
      toast.success('添加成功');
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', relationship_type: '子女', is_primary: false });
      load();
    } catch {
      toast.error('添加失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该守护人？')) return;
    try {
      await api.delete(`/guardians/${id}`);
      toast.success('已删除');
      load();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleNotify = async (id: number) => {
    try {
      await api.post(`/guardians/${id}/notify`);
      toast.success('已发送通知');
    } catch {
      toast.error('通知失败');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary-500" />
          守护者管理
        </h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600">
          <Plus className="w-4 h-4" /> 添加
        </button>
      </div>

      <p className="text-sm text-gray-500">
        添加家人或朋友作为守护者，当检测到高风险诈骗时将自动通知他们保护您的安全。
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">监护联动状态</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {wsConnected ? '实时已连接' : '未连接'}
          </span>
        </div>
        <div className="mt-3 space-y-2 max-h-52 overflow-auto">
          {events.length === 0 ? (
            <p className="text-xs text-gray-400">暂无实时联动事件</p>
          ) : events.map((evt) => (
            <div key={evt.id} className="text-xs bg-gray-50 rounded-lg p-2 border border-gray-100">
              <div className="font-medium text-gray-700">{evt.event}</div>
              <div className="text-gray-500 mt-1">{new Date(evt.timestamp).toLocaleString()}</div>
              {evt.payload?.message && <div className="text-gray-600 mt-1">{evt.payload.message}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 添加表单 */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">添加守护人</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="姓名 *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            <input placeholder="电话 *" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            <input placeholder="邮箱" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            <select value={form.relationship_type}
              onChange={(e) => setForm({ ...form, relationship_type: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm">
              {relationships.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm text-gray-600">
            <input type="checkbox" checked={form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
            设为主要守护人
          </label>
          <button onClick={handleAdd}
            className="mt-4 w-full bg-primary-500 text-white py-2.5 rounded-lg hover:bg-primary-600 text-sm font-medium">
            确认添加
          </button>
        </div>
      )}

      {/* 守护人列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : guardians.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">暂无守护人</p>
          <p className="text-gray-400 text-sm">点击"添加"按钮添加守护人</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guardians.map((g) => (
            <div key={g.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                    {g.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{g.name}</h4>
                      {g.is_primary && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{g.relationship_type}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{g.phone}</span>
                      {g.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{g.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleNotify(g.id)} title="发送测试通知"
                    className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg">
                    <Bell className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(g.id)} title="删除"
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
