import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon, UserPlusIcon, PhoneIcon, BellAlertIcon,
  ShieldCheckIcon, ExclamationTriangleIcon, CheckCircleIcon,
  XMarkIcon, ClipboardDocumentIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { ScrollReveal, StaggerContainer, StaggerItem, HoverCard } from '../components/motion';
import { Link } from 'react-router-dom';

interface ChargeUser { relation_id: number; user_id: number; username: string; nickname: string; age: number | null; role_type: string; risk_score: number; total_detections: number; fraud_hits: number; relationship: string; is_primary: boolean; created_at: string; }
interface Guardian { id: number; guardian_id: number; guardian_username: string; guardian_nickname: string; relationship: string; is_primary: boolean; created_at: string; }
interface AlertStats { pending: number; resolved: number; total: number; }

// 关系图谱组件
function RelationshipGraph({ charges, guardians }: { charges: ChargeUser[]; guardians: Guardian[] }) {
  const hasData = charges.length > 0 || guardians.length > 0;
  const nodes = hasData
    ? [
        ...charges.map((c, i) => ({ name: c.nickname || c.username, type: 'charge' as const, color: 'from-orange-400 to-pink-400', angle: (i * 360) / Math.max(charges.length + guardians.length, 1) })),
        ...guardians.map((g, i) => ({ name: g.guardian_nickname || g.guardian_username, type: 'guardian' as const, color: 'from-green-400 to-emerald-500', angle: ((charges.length + i) * 360) / Math.max(charges.length + guardians.length, 1) })),
      ]
    : [
        { name: '父亲', type: 'charge' as const, color: 'from-blue-400 to-sky-500', angle: 0 },
        { name: '母亲', type: 'charge' as const, color: 'from-pink-400 to-rose-400', angle: 72 },
        { name: '子女', type: 'guardian' as const, color: 'from-green-400 to-emerald-500', angle: 144 },
        { name: '配偶', type: 'charge' as const, color: 'from-purple-400 to-violet-500', angle: 216 },
        { name: '朋友', type: 'guardian' as const, color: 'from-amber-400 to-orange-400', angle: 288 },
      ];

  const radius = 100;
  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      {/* 连接线 */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
        {nodes.map((node, i) => {
          const x = 140 + Math.cos((node.angle - 90) * Math.PI / 180) * radius;
          const y = 140 + Math.sin((node.angle - 90) * Math.PI / 180) * radius;
          return (
            <motion.line key={i} x1="140" y1="140" x2={x} y2={y}
              stroke={node.type === 'charge' ? 'rgba(251,146,60,0.3)' : 'rgba(52,211,153,0.3)'}
              strokeWidth="2" strokeDasharray="4 4"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: i * 0.15 }}
            />
          );
        })}
      </svg>
      {/* 中心节点 */}
      <motion.div className="node-center absolute" style={{ left: 'calc(50% - 32px)', top: 'calc(50% - 32px)' }}
        animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}
      >我</motion.div>
      {/* 外围节点 */}
      {nodes.map((node, i) => {
        const x = 140 + Math.cos((node.angle - 90) * Math.PI / 180) * radius - 24;
        const y = 140 + Math.sin((node.angle - 90) * Math.PI / 180) * radius - 24;
        return (
          <motion.div key={i} className={`node-family absolute bg-gradient-to-br ${node.color} text-white`}
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1, y: { duration: 3, repeat: Infinity, delay: i * 0.5 } }}
          >
            {node.name.charAt(0)}
          </motion.div>
        );
      })}
      {/* 节点标签 */}
      {nodes.map((node, i) => {
        const labelX = 140 + Math.cos((node.angle - 90) * Math.PI / 180) * (radius + 30);
        const labelY = 140 + Math.sin((node.angle - 90) * Math.PI / 180) * (radius + 30);
        return (
          <motion.span key={`label-${i}`} className="absolute text-xs text-slate-500 font-medium whitespace-nowrap"
            style={{ left: labelX, top: labelY, transform: 'translate(-50%, -50%)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >{node.name}</motion.span>
        );
      })}
    </div>
  );
}

// 邀请码特权卡
function InviteTicket({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <motion.div className="ticket-card p-0 relative" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <div className="flex items-stretch min-h-[90px]">
        {/* 左侧标签区 */}
        <div className="flex flex-col items-center justify-center px-5 py-4 bg-white/10">
          <ShieldCheckIcon className="w-7 h-7 text-white/90 mb-1" />
          <span className="text-[10px] text-white/70 font-medium">INVITE</span>
        </div>
        {/* 虚线分割 */}
        <div className="w-px bg-white/20 my-3" style={{ borderLeft: '2px dashed rgba(255,255,255,0.25)' }} />
        {/* 右侧邀请码 */}
        <div className="flex-1 flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[10px] text-white/60 mb-1 uppercase tracking-wider">我的邀请码</p>
            <p className="text-lg font-mono font-bold text-white tracking-widest">{code}</p>
          </div>
          <motion.button onClick={onCopy}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            whileTap={{ scale: 0.9 }}
          >
            <ClipboardDocumentIcon className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>
      {/* 装饰光条 */}
      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white/5 to-transparent" />
    </motion.div>
  );
}

export default function Family() {
  const { user } = useAuthStore();
  const [charges, setCharges] = useState<ChargeUser[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({ pending: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'guardian' | 'charge'>('charge');
  const [searchUsername, setSearchUsername] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inviteCode = user?.username ? `INV-${user.username.toUpperCase().slice(0, 4)}-${user.id}` : '';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chargesRes, guardiansRes, statsRes] = await Promise.all([
        api.get('/guardians/charges'),
        api.get('/guardians/'),
        api.get('/alerts/stats').catch(() => null),
      ]);
      setCharges(chargesRes.data || []); setGuardians(guardiansRes.data || []);
      if (statsRes?.data) {
        setAlertStats({ pending: statsRes.data.pending || 0, resolved: statsRes.data.resolved || 0, total: statsRes.data.total || 0 });
      }
    } catch (err) { console.error('加载守护数据失败:', err); }
    finally { setLoading(false); }
  };

  const handleAddGuardian = async () => {
    if (!searchUsername.trim()) { toast.error('请输入用户名'); return; }
    setIsSubmitting(true);
    try {
      await api.post('/guardians/bind', { guardian_username: searchUsername.trim(), relationship: relationship || '家人', is_primary: guardians.length === 0 });
      toast.success('已成功添加监护人'); setShowAddModal(false); setSearchUsername(''); setRelationship(''); loadData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : '添加失败，请检查用户名是否正确'); }
    finally { setIsSubmitting(false); }
  };

  const handleUnbind = async (relationId: number, name: string) => {
    if (!confirm(`确定要解除与「${name}」的监护关系吗？`)) return;
    try { await api.delete(`/guardians/${relationId}`); toast.success('已解除监护关系'); loadData(); } catch { toast.error('解除失败'); }
  };

  const handleNotify = async (chargeUser: ChargeUser) => {
    try { await api.post('/guardians/notify', { user_id: chargeUser.user_id, message: `系统检测到可能的风险，请关注「${chargeUser.nickname}」的安全状态。` }).catch(() => {}); toast.success(`已向「${chargeUser.nickname}」发送安全提醒`); }
    catch { toast.error('发送失败'); }
  };

  const handleEmergency = async () => {
    if (!confirm('确定要向所有监护人发送紧急通报吗？')) return;
    try { await api.post('/guardians/emergency').catch(() => {}); toast.success('已向所有监护人发送紧急通报'); } catch { toast.error('通报失败'); }
  };

  const copyInviteCode = () => { navigator.clipboard.writeText(inviteCode); toast.success('邀请码已复制'); };
  const getRiskColor = (s: number) => { if (s >= 0.7) return 'text-red-600 bg-red-100'; if (s >= 0.4) return 'text-amber-600 bg-amber-100'; return 'text-green-600 bg-green-100'; };
  const getRiskLabel = (s: number) => { if (s >= 0.7) return '高风险'; if (s >= 0.4) return '中风险'; return '安全'; };

  if (loading) return (
    <div className="space-y-6">
      <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 标题 + 邀请码特权卡 */}
      <ScrollReveal>
        <div className="card-glass bg-gradient-to-r from-sky-50/80 to-blue-50/80 border-sky-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">家庭守护</h1>
              <p className="text-slate-600 text-sm sm:text-base">管理守护关系，保护家人安全</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="w-full sm:w-72"><InviteTicket code={inviteCode} onCopy={copyInviteCode} /></div>
              <button onClick={() => { setAddType('charge'); setShowAddModal(true); }} className="btn btn-primary text-sm whitespace-nowrap">
                <UserPlusIcon className="w-4 h-4" />添加被守护者
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 关系图谱 */}
      <ScrollReveal delay={0.1}>
        <div className="card-glass">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">守护关系图谱</h2>
          <RelationshipGraph charges={charges} guardians={guardians} />
          {charges.length === 0 && guardians.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-4">以上为示例关系 · 添加成员后将显示真实图谱</p>
          )}
        </div>
      </ScrollReveal>

      {/* 统计卡片 */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: UserGroupIcon, color: 'bg-sky-100', iconColor: 'text-sky-600', value: charges.length, label: '被守护者' },
          { icon: ShieldCheckIcon, color: 'bg-green-100', iconColor: 'text-green-600', value: guardians.length, label: '我的监护人' },
          { icon: BellAlertIcon, color: 'bg-amber-100', iconColor: 'text-amber-600', value: alertStats.pending, label: '待处理预警', link: '/alerts?filter=pending', highlight: true },
          { icon: CheckCircleIcon, color: 'bg-purple-100', iconColor: 'text-purple-600', value: alertStats.resolved, label: '已处理' },
        ].map((s, i) => (
          <StaggerItem key={i}>
            {s.link ? (
              <Link to={s.link}><HoverCard className="stat-card cursor-pointer hover-glow"><div className={`stat-icon ${s.color}`}><s.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.iconColor}`} /></div><div className={`stat-value text-xl sm:text-2xl ${s.highlight ? 'text-amber-600' : ''}`}>{s.value}</div><div className="stat-label text-xs sm:text-sm">{s.label}</div></HoverCard></Link>
            ) : (
              <HoverCard className="stat-card hover-glow"><div className={`stat-icon ${s.color}`}><s.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.iconColor}`} /></div><div className="stat-value text-xl sm:text-2xl">{s.value}</div><div className="stat-label text-xs sm:text-sm">{s.label}</div></HoverCard>
            )}
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* 被守护者列表 */}
      <ScrollReveal delay={0.2}>
        <div className="card-glass">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><UserGroupIcon className="w-5 h-5 text-sky-500" />我守护的人</h2>
            {charges.length > 0 && <Link to="/alerts" className="text-sm text-sky-600 hover:text-sky-700">查看全部预警 →</Link>}
          </div>
          {charges.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 mb-4">还没有被守护者</p>
              <button onClick={() => { setAddType('charge'); setShowAddModal(true); }} className="btn btn-outline"><UserPlusIcon className="w-4 h-4" />添加被守护者</button>
            </div>
          ) : (
            <div className="space-y-3">
              {charges.map(charge => (
                <motion.div key={charge.relation_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100 transition-colors"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{charge.nickname?.charAt(0) || charge.username?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{charge.nickname || charge.username}</span>
                      <span className="text-xs text-slate-400">@{charge.username}</span>
                      {charge.relationship && <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-600">{charge.relationship}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>检测 {charge.total_detections} 次</span><span>风险命中 {charge.fraud_hits} 次</span>{charge.age && <span>{charge.age}岁</span>}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(charge.risk_score)}`}>{getRiskLabel(charge.risk_score)}</div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => handleNotify(charge)} className="flex-1 sm:flex-none btn btn-outline text-sm py-2"><BellAlertIcon className="w-4 h-4" /><span className="sm:hidden md:inline">通知</span></button>
                    <a href={`tel:${charge.username}`} className="flex-1 sm:flex-none btn btn-ghost text-sm py-2"><PhoneIcon className="w-4 h-4" /></a>
                    <button onClick={() => handleUnbind(charge.relation_id, charge.nickname || charge.username)} className="btn btn-ghost text-red-500 hover:bg-red-50 text-sm py-2"><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* 我的监护人 */}
      <ScrollReveal delay={0.3}>
        <div className="card-glass">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5 text-green-500" />守护我的人</h2>
            <button onClick={() => { setAddType('guardian'); setShowAddModal(true); }} className="text-sm text-sky-600 hover:text-sky-700">+ 添加监护人</button>
          </div>
          {guardians.length === 0 ? (
            <div className="text-center py-8 text-slate-500"><p>还没有监护人</p><p className="text-sm mt-1">让家人输入你的邀请码来成为你的监护人</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guardians.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-50/80 border border-green-200 backdrop-blur">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">{g.guardian_nickname?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{g.guardian_nickname || g.guardian_username}</div>
                    <div className="text-xs text-slate-500">{g.relationship || '监护人'}{g.is_primary && ' · 主要监护人'}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <div className="breathing-dot breathing-dot-safe" style={{width:5,height:5}} /> 守护中
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* 紧急通报 */}
      {guardians.length > 0 && (
        <ScrollReveal delay={0.4}>
          <div className="card-glass bg-gradient-to-r from-red-50/80 to-orange-50/80 border-red-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><ExclamationTriangleIcon className="w-8 h-8 text-red-500" /></div>
              <div className="flex-1"><h3 className="font-semibold text-red-700 mb-1">一键紧急通报</h3><p className="text-slate-600 text-sm">立即通知所有监护人（{guardians.length}人），发送紧急求助信息</p></div>
              <button onClick={handleEmergency} className="w-full sm:w-auto btn bg-red-500 hover:bg-red-600 text-white py-3 px-6">🆘 一键求助</button>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* 添加弹窗 */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)}
          >
            <motion.div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">{addType === 'guardian' ? '添加监护人' : '添加被守护者'}</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><XMarkIcon className="w-5 h-5 text-slate-500" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">输入对方的用户名</label>
                  <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} placeholder="请输入用户名..." className="input pl-10" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">关系（可选）</label>
                  <select value={relationship} onChange={e => setRelationship(e.target.value)} className="select w-full">
                    <option value="">请选择</option><option value="父亲">父亲</option><option value="母亲">母亲</option><option value="爷爷">爷爷</option><option value="奶奶">奶奶</option><option value="子女">子女</option><option value="配偶">配偶</option><option value="其他亲属">其他亲属</option>
                  </select>
                </div>
                {addType === 'charge' && <div className="p-3 bg-sky-50 rounded-lg text-sm text-sky-700"><p>💡 提示：对方需要先注册账号，然后您输入对方的用户名即可建立守护关系。</p></div>}
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 btn btn-outline">取消</button>
                <button onClick={handleAddGuardian} disabled={isSubmitting || !searchUsername.trim()} className="flex-1 btn btn-primary">{isSubmitting ? '添加中...' : '确认添加'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
