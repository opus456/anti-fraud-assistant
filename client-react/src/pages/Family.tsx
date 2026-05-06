import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon, UserPlusIcon, PhoneIcon, BellAlertIcon,
  ShieldCheckIcon, ExclamationTriangleIcon, CheckCircleIcon,
  XMarkIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import toast from 'react-hot-toast';
import { ScrollReveal, StaggerContainer, StaggerItem, HoverCard } from '../components/motion';
import { Link } from 'react-router-dom';

interface ChargeUser { relation_id: number; user_id: number; username: string; nickname: string; age: number | null; role_type: string; risk_score: number; total_detections: number; fraud_hits: number; relationship: string; is_primary: boolean; created_at: string; }
interface Guardian { id: number; guardian_id: number; guardian_username: string; guardian_nickname: string; relationship: string; is_primary: boolean; created_at: string; }
interface AlertStats { pending: number; resolved: number; total: number; }

interface RelationshipNode {
  id: string;
  name: string;
  relation: string;
  meta: string;
  tone: 'charge' | 'guardian';
}

// 关系图谱组件
function RelationshipGraph({ charges, guardians }: { charges: ChargeUser[]; guardians: Guardian[] }) {
  const hasData = charges.length > 0 || guardians.length > 0;
  const chargeNodes: RelationshipNode[] = hasData
    ? charges.map((charge) => ({
        id: `charge-${charge.relation_id}`,
        name: charge.nickname || charge.username,
        relation: charge.relationship || '被守护者',
        meta: `${charge.total_detections} 次检测 · ${charge.fraud_hits} 次命中`,
        tone: 'charge',
      }))
    : [
        { id: 'sample-charge-father', name: '父亲', relation: '被守护者', meta: '12 次检测 · 1 次命中', tone: 'charge' },
        { id: 'sample-charge-mother', name: '母亲', relation: '被守护者', meta: '8 次检测 · 0 次命中', tone: 'charge' },
      ];

  const guardianNodes: RelationshipNode[] = hasData
    ? guardians.map((guardian) => ({
        id: `guardian-${guardian.id}`,
        name: guardian.guardian_nickname || guardian.guardian_username,
        relation: guardian.relationship || '监护人',
        meta: guardian.is_primary ? '主要监护人 · 实时联动' : '协同监护 · 已连接',
        tone: 'guardian',
      }))
    : [
        { id: 'sample-guardian-child', name: '子女', relation: '监护人', meta: '主要监护人 · 实时联动', tone: 'guardian' },
        { id: 'sample-guardian-friend', name: '朋友', relation: '协同监护', meta: '辅助守护 · 已连接', tone: 'guardian' },
      ];

  const renderNode = (node: RelationshipNode, align: 'left' | 'right') => {
    const accentClass = node.tone === 'charge'
      ? 'border-amber-200 bg-white/90 shadow-[0_12px_32px_rgba(245,158,11,0.10)]'
      : 'border-emerald-200 bg-white/90 shadow-[0_12px_32px_rgba(16,185,129,0.10)]';
    const badgeClass = node.tone === 'charge'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-emerald-50 text-emerald-700';
    const dotClass = node.tone === 'charge' ? 'bg-amber-400' : 'bg-emerald-400';

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: align === 'left' ? -12 : 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className={`relative rounded-2xl border p-4 ${accentClass}`}
      >
        <div className={`absolute top-1/2 hidden h-px w-6 -translate-y-1/2 bg-slate-300 lg:block ${align === 'left' ? '-right-6' : '-left-6'}`} />
        <div className="flex items-start gap-3">
          <div className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">{node.name}</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>{node.relation}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{node.meta}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(248,250,252,0.96))] p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-y-8 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-slate-200 to-transparent lg:block" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] lg:items-center">
        <div className="space-y-3 lg:pr-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">被守护者</p>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{charges.length} 人</span>
          </div>
          <div className="space-y-3">
            {chargeNodes.map((node) => renderNode(node, 'left'))}
          </div>
        </div>

        <div className="relative mx-auto flex h-[280px] w-full max-w-[280px] items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            className="absolute h-[220px] w-[220px] rounded-full border border-dashed border-sky-200/80"
          />
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute h-[168px] w-[168px] rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.12),_rgba(255,255,255,0.0)_70%)]"
          />
          <div className="relative flex h-40 w-40 flex-col items-center justify-center rounded-[32px] border border-sky-200 bg-white/95 text-center shadow-[0_24px_60px_rgba(14,165,233,0.12)]">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/20">
              <ShieldCheckIcon className="h-7 w-7" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">守护中枢</p>
            <p className="mt-1 text-xl font-black tracking-tight text-slate-900">我</p>
            <p className="mt-2 max-w-[120px] text-xs leading-5 text-slate-500">连接家庭成员、同步预警、分发通知</p>
          </div>
        </div>

        <div className="space-y-3 lg:pl-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">监护人</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{guardians.length} 人</span>
          </div>
          <div className="space-y-3">
            {guardianNodes.map((node) => renderNode(node, 'right'))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Family() {
  const [charges, setCharges] = useState<ChargeUser[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({ pending: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'guardian' | 'charge'>('charge');
  const [searchUsername, setSearchUsername] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const getRiskColor = (s: number) => { if (s >= 0.7) return 'text-rose-600 bg-rose-50'; if (s >= 0.4) return 'text-amber-600 bg-amber-50'; return 'text-emerald-600 bg-emerald-50'; };
  const getRiskLabel = (s: number) => { if (s >= 0.7) return '高风险'; if (s >= 0.4) return '中风险'; return '安全'; };
  const alertHandlingRate = alertStats.total > 0 ? Math.round((alertStats.resolved / alertStats.total) * 100) : 100;

  if (loading) return (
    <div className="space-y-6">
      <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <ScrollReveal>
        <div className="card-glass bg-gradient-to-r from-sky-50/80 to-blue-50/80 border-sky-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">家庭守护</h1>
              <p className="text-slate-500 text-sm sm:text-base">管理守护关系，按用户名添加成员并同步家庭安全状态。</p>
            </div>
            <div className="flex w-full lg:w-auto">
              <button onClick={() => { setAddType('charge'); setShowAddModal(true); }} className="btn btn-primary text-sm whitespace-nowrap">
                <UserPlusIcon className="w-4 h-4" />添加被守护者
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 守护网络概览 */}
      <ScrollReveal delay={0.1}>
        <div className="card-glass overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">守护关系图谱</h2>
                <p className="mt-1 text-sm text-slate-500">用更清晰的网络视图查看谁在守护你、你在守护谁。</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">{charges.length || 2} 个被守护者节点</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">{guardians.length || 2} 个监护人节点</span>
              </div>
            </div>
          </div>
          <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <RelationshipGraph charges={charges} guardians={guardians} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">守护覆盖</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{charges.length + guardians.length}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">当前已建立 {charges.length} 条下行守护关系和 {guardians.length} 条上行监护关系。</p>
              </div>
              <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">预警处置率</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{alertHandlingRate}%</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">累计 {alertStats.total} 条家庭相关预警，已完成 {alertStats.resolved} 条处理。</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">网络状态</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-600">高风险成员</span>
                    <span className="font-semibold text-rose-600">{charges.filter((charge) => charge.risk_score >= 0.7).length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-600">主要监护人</span>
                    <span className="font-semibold text-emerald-600">{guardians.filter((guardian) => guardian.is_primary).length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-600">待处理预警</span>
                    <span className="font-semibold text-amber-600">{alertStats.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {charges.length === 0 && guardians.length === 0 && (
            <div className="border-t border-slate-200 px-5 py-4 text-center text-sm text-slate-500 sm:px-6">当前展示的是示意网络。添加家庭成员后，这里会自动切换成真实守护关系。</div>
          )}
        </div>
      </ScrollReveal>

      {/* 家庭守护指标 */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: UserGroupIcon, color: 'bg-sky-100', iconColor: 'text-sky-600', value: charges.length, label: '被守护者' },
          { icon: ShieldCheckIcon, color: 'bg-emerald-50', iconColor: 'text-emerald-600', value: guardians.length, label: '我的监护人' },
          { icon: BellAlertIcon, color: 'bg-amber-50', iconColor: 'text-amber-600', value: alertStats.pending, label: '待处理预警', link: '/alerts?filter=pending', highlight: true },
          { icon: CheckCircleIcon, color: 'bg-purple-500/15', iconColor: 'text-purple-600', value: alertStats.resolved, label: '已处理预警' },
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
              <UserGroupIcon className="w-16 h-16 mx-auto text-slate-800 mb-4" />
              <p className="text-slate-500 mb-4">还没有被守护者</p>
              <button onClick={() => { setAddType('charge'); setShowAddModal(true); }} className="btn btn-outline"><UserPlusIcon className="w-4 h-4" />添加被守护者</button>
            </div>
          ) : (
            <div className="space-y-3">
              {charges.map(charge => (
                <motion.div key={charge.relation_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-white/80 hover:bg-slate-100 transition-colors"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{charge.nickname?.charAt(0) || charge.username?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{charge.nickname || charge.username}</span>
                      <span className="text-xs text-slate-500">@{charge.username}</span>
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
                    <button onClick={() => handleUnbind(charge.relation_id, charge.nickname || charge.username)} className="btn btn-ghost text-rose-600 hover:bg-rose-50 text-sm py-2"><XMarkIcon className="w-4 h-4" /></button>
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
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5 text-emerald-600" />守护我的人</h2>
            <button onClick={() => { setAddType('guardian'); setShowAddModal(true); }} className="text-sm text-sky-600 hover:text-sky-700">+ 添加监护人</button>
          </div>
          {guardians.length === 0 ? (
            <div className="text-center py-8 text-slate-500"><p>还没有监护人</p><p className="text-sm mt-1">点击上方添加监护人，输入对方用户名后即可建立守护关系</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guardians.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 backdrop-blur">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">{g.guardian_nickname?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{g.guardian_nickname || g.guardian_username}</div>
                    <div className="text-xs text-slate-500">{g.relationship || '监护人'}{g.is_primary && ' · 主要监护人'}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
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
          <div className="card-glass bg-gradient-to-r from-red-50/80 to-orange-50/80 border-rose-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0"><ExclamationTriangleIcon className="w-8 h-8 text-rose-600" /></div>
              <div className="flex-1"><h3 className="font-semibold text-red-700 mb-1">一键紧急通报</h3><p className="text-slate-500 text-sm">立即通知所有监护人（{guardians.length}人），发送紧急求助信息</p></div>
              <button onClick={handleEmergency} className="w-full sm:w-auto btn bg-rose-500 hover:bg-rose-600 text-white py-3 px-6">🆘 一键求助</button>
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
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">{addType === 'guardian' ? '添加监护人' : '添加被守护者'}</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><XMarkIcon className="w-5 h-5 text-slate-500" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">输入对方的用户名</label>
                  <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" /><input type="text" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} placeholder="请输入用户名..." className="input pl-10" /></div>
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
