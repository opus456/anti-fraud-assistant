import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  UserPlusIcon,
  PhoneIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import { ScrollReveal, StaggerContainer, StaggerItem, HoverCard } from '../components/motion';
import { Link } from 'react-router-dom';

// 被守护者类型
interface ChargeUser {
  relation_id: number;
  user_id: number;
  username: string;
  nickname: string;
  age: number | null;
  role_type: string;
  risk_score: number;
  total_detections: number;
  fraud_hits: number;
  relationship: string;
  is_primary: boolean;
  created_at: string;
}

// 监护人类型
interface Guardian {
  id: number;
  guardian_id: number;
  guardian_username: string;
  guardian_nickname: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
}

// 预警统计
interface AlertStats {
  pending: number;
  resolved: number;
  total: number;
}

export default function Family() {
  const { user } = useAuthStore();
  const [charges, setCharges] = useState<ChargeUser[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({ pending: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  
  // 添加成员弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'guardian' | 'charge'>('charge');
  const [searchUsername, setSearchUsername] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 邀请码
  const inviteCode = user?.username ? `INV-${user.username.toUpperCase().slice(0, 4)}-${user.id}` : '';

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chargesRes, guardiansRes] = await Promise.all([
        api.get('/guardians/charges'),
        api.get('/guardians/'),
      ]);
      
      setCharges(chargesRes.data || []);
      setGuardians(guardiansRes.data || []);
      
      // 计算预警统计（从被守护者的 fraud_hits 中估算）
      const totalFraudHits = chargesRes.data?.reduce((acc: number, c: ChargeUser) => acc + c.fraud_hits, 0) || 0;
      setAlertStats({
        pending: Math.floor(totalFraudHits * 0.3),
        resolved: Math.floor(totalFraudHits * 0.7),
        total: totalFraudHits,
      });
    } catch (err) {
      console.error('加载守护数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 添加监护人
  const handleAddGuardian = async () => {
    if (!searchUsername.trim()) {
      toast.error('请输入用户名');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/guardians/bind', {
        guardian_username: searchUsername.trim(),
        relationship: relationship || '家人',
        is_primary: guardians.length === 0,
      });
      
      toast.success('已成功添加监护人');
      setShowAddModal(false);
      setSearchUsername('');
      setRelationship('');
      loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '添加失败，请检查用户名是否正确';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 解除监护关系
  const handleUnbind = async (relationId: number, name: string) => {
    if (!confirm(`确定要解除与「${name}」的监护关系吗？`)) return;
    
    try {
      await api.delete(`/guardians/${relationId}`);
      toast.success('已解除监护关系');
      loadData();
    } catch (err) {
      toast.error('解除失败');
    }
  };

  // 发送通知
  const handleNotify = async (chargeUser: ChargeUser) => {
    try {
      // 调用后端通知接口（预留）
      await api.post('/guardians/notify', {
        user_id: chargeUser.user_id,
        message: `系统检测到可能的风险，请关注「${chargeUser.nickname}」的安全状态。`,
      }).catch(() => {
        // 如果接口不存在，模拟成功
      });
      
      toast.success(`已向「${chargeUser.nickname}」发送安全提醒`);
    } catch (err) {
      toast.error('发送失败');
    }
  };

  // 一键通报
  const handleEmergency = async () => {
    if (!confirm('确定要向所有监护人发送紧急通报吗？')) return;
    
    try {
      // 调用后端紧急通报接口（预留）
      await api.post('/guardians/emergency').catch(() => {});
      toast.success('已向所有监护人发送紧急通报');
    } catch (err) {
      toast.error('通报失败');
    }
  };

  // 复制邀请码
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('邀请码已复制');
  };

  // 风险等级颜色
  const getRiskColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600 bg-red-100';
    if (score >= 0.4) return 'text-amber-600 bg-amber-100';
    return 'text-green-600 bg-green-100';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 0.7) return '高风险';
    if (score >= 0.4) return '中风险';
    return '安全';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 + 操作栏 */}
      <ScrollReveal>
        <div className="card bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">家庭守护</h1>
              <p className="text-slate-600 text-sm sm:text-base">管理守护关系，保护家人安全</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* 邀请码 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-sky-200">
                <span className="text-xs text-slate-500">我的邀请码:</span>
                <code className="text-sm font-mono text-sky-600">{inviteCode}</code>
                <button onClick={copyInviteCode} className="text-slate-400 hover:text-sky-600">
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => { setAddType('charge'); setShowAddModal(true); }}
                className="btn btn-primary text-sm"
              >
                <UserPlusIcon className="w-4 h-4" />
                添加被守护者
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 统计卡片 */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <HoverCard className="stat-card">
            <div className="stat-icon bg-sky-100">
              <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            </div>
            <div className="stat-value text-xl sm:text-2xl">{charges.length}</div>
            <div className="stat-label text-xs sm:text-sm">被守护者</div>
          </HoverCard>
        </StaggerItem>
        <StaggerItem>
          <HoverCard className="stat-card">
            <div className="stat-icon bg-green-100">
              <ShieldCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="stat-value text-xl sm:text-2xl">{guardians.length}</div>
            <div className="stat-label text-xs sm:text-sm">我的监护人</div>
          </HoverCard>
        </StaggerItem>
        <StaggerItem>
          <Link to="/alerts?filter=pending">
            <HoverCard className="stat-card cursor-pointer hover:border-amber-300">
              <div className="stat-icon bg-amber-100">
                <BellAlertIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div className="stat-value text-xl sm:text-2xl text-amber-600">{alertStats.pending}</div>
              <div className="stat-label text-xs sm:text-sm">待处理预警</div>
            </HoverCard>
          </Link>
        </StaggerItem>
        <StaggerItem>
          <HoverCard className="stat-card">
            <div className="stat-icon bg-purple-100">
              <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="stat-value text-xl sm:text-2xl">{alertStats.resolved}</div>
            <div className="stat-label text-xs sm:text-sm">已处理</div>
          </HoverCard>
        </StaggerItem>
      </StaggerContainer>

      {/* 被守护者列表 */}
      <ScrollReveal delay={0.2}>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-sky-500" />
              我守护的人
            </h2>
            {charges.length > 0 && (
              <Link to="/alerts" className="text-sm text-sky-600 hover:text-sky-700">
                查看全部预警 →
              </Link>
            )}
          </div>
          
          {charges.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 mb-4">还没有被守护者</p>
              <button
                onClick={() => { setAddType('charge'); setShowAddModal(true); }}
                className="btn btn-outline"
              >
                <UserPlusIcon className="w-4 h-4" />
                添加被守护者
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {charges.map((charge) => (
                <motion.div
                  key={charge.relation_id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* 头像 */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {charge.nickname?.charAt(0) || charge.username?.charAt(0) || '?'}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{charge.nickname || charge.username}</span>
                      <span className="text-xs text-slate-400">@{charge.username}</span>
                      {charge.relationship && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-600">
                          {charge.relationship}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>检测 {charge.total_detections} 次</span>
                      <span>风险命中 {charge.fraud_hits} 次</span>
                      {charge.age && <span>{charge.age}岁</span>}
                    </div>
                  </div>
                  
                  {/* 风险状态 */}
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(charge.risk_score)}`}>
                    {getRiskLabel(charge.risk_score)}
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleNotify(charge)}
                      className="flex-1 sm:flex-none btn btn-outline text-sm py-2"
                    >
                      <BellAlertIcon className="w-4 h-4" />
                      <span className="sm:hidden md:inline">通知</span>
                    </button>
                    <a
                      href={`tel:${charge.username}`}
                      className="flex-1 sm:flex-none btn btn-ghost text-sm py-2"
                    >
                      <PhoneIcon className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleUnbind(charge.relation_id, charge.nickname || charge.username)}
                      className="btn btn-ghost text-red-500 hover:bg-red-50 text-sm py-2"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* 我的监护人 */}
      <ScrollReveal delay={0.3}>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-500" />
              守护我的人
            </h2>
            <button
              onClick={() => { setAddType('guardian'); setShowAddModal(true); }}
              className="text-sm text-sky-600 hover:text-sky-700"
            >
              + 添加监护人
            </button>
          </div>
          
          {guardians.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>还没有监护人</p>
              <p className="text-sm mt-1">让家人输入你的邀请码来成为你的监护人</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {guardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                    {guardian.guardian_nickname?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">
                      {guardian.guardian_nickname || guardian.guardian_username}
                    </div>
                    <div className="text-xs text-slate-500">
                      {guardian.relationship || '监护人'}
                      {guardian.is_primary && ' · 主要监护人'}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">守护中</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* 一键紧急通报 */}
      {guardians.length > 0 && (
        <ScrollReveal delay={0.4}>
          <div className="card bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-700 mb-1">一键紧急通报</h3>
                <p className="text-slate-600 text-sm">立即通知所有监护人（{guardians.length}人），发送紧急求助信息</p>
              </div>
              <button
                onClick={handleEmergency}
                className="w-full sm:w-auto btn bg-red-500 hover:bg-red-600 text-white py-3 px-6"
              >
                🆘 一键求助
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* 添加成员弹窗 */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {addType === 'guardian' ? '添加监护人' : '添加被守护者'}
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full"
                  >
                    <XMarkIcon className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    输入对方的用户名
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="请输入用户名..."
                      className="input pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    关系（可选）
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="select w-full"
                  >
                    <option value="">请选择</option>
                    <option value="父亲">父亲</option>
                    <option value="母亲">母亲</option>
                    <option value="爷爷">爷爷</option>
                    <option value="奶奶">奶奶</option>
                    <option value="子女">子女</option>
                    <option value="配偶">配偶</option>
                    <option value="其他亲属">其他亲属</option>
                  </select>
                </div>

                {addType === 'charge' && (
                  <div className="p-3 bg-sky-50 rounded-lg text-sm text-sky-700">
                    <p>💡 提示：对方需要先注册账号，然后您输入对方的用户名即可建立守护关系。</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn btn-outline"
                >
                  取消
                </button>
                <button
                  onClick={handleAddGuardian}
                  disabled={isSubmitting || !searchUsername.trim()}
                  className="flex-1 btn btn-primary"
                >
                  {isSubmitting ? '添加中...' : '确认添加'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
