import { useState } from 'react';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../components/motion';
import {
  BellIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CheckIcon,
  UserIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store';
import { useSettingsStore, type AppSettings } from '../store/settingsStore';
import api from '../api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const provinces = [
  '北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '山东',
  '河南', '福建', '湖南', '安徽', '重庆', '陕西', '辽宁', '天津',
  '云南', '河北', '广西', '山西', '贵州', '吉林', '甘肃', '海南',
  '江西', '黑龙江', '内蒙古', '新疆', '宁夏', '西藏', '青海',
];

export default function Settings() {
  const { user, setAuth } = useAuthStore();
  const { settings, updateSetting } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    nickname: user?.nickname || '',
    email: user?.email || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
    role_type: user?.role_type || '',
    occupation: user?.occupation || '',
    education: user?.education || '',
    province: user?.province || '',
    city: user?.city || '',
  });

  // 处理设置变更并自动保存
  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSetting(key, value);
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const payload = {
        ...profileForm,
        age: profileForm.age ? parseInt(profileForm.age, 10) : undefined,
      };

      const response = await api.put('/auth/profile', payload);
      
      if (response.data) {
        // Update user in auth store
        const updatedUser = {
          ...user,
          ...response.data,
        };
        setAuth(updatedUser, localStorage.getItem('token') || '');
        
        toast.success('资料更新成功');
        setIsEditing(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileForm({
      nickname: user?.nickname || '',
      email: user?.email || '',
      age: user?.age?.toString() || '',
      gender: user?.gender || '',
      role_type: user?.role_type || '',
      occupation: user?.occupation || '',
      education: user?.education || '',
      province: user?.province || '',
      city: user?.city || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#1e293b] p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-slate-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-40 h-40 sm:w-52 sm:h-52 text-white/[0.03]" viewBox="0 0 24 24" fill="currentColor"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <div className="relative z-10">
            <p className="text-white/40 text-sm mb-2 font-medium">Settings · 设置中心</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">个人设置</h1>
            <p className="text-white/40 text-sm">管理您的个人资料和系统偏好</p>
          </div>
        </div>
      </ScrollReveal>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'profile'
              ? 'bg-[#0D9488] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4 inline-block mr-2" />
          个人资料
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'system'
              ? 'bg-[#0D9488] text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cog6ToothIcon className="w-4 h-4 inline-block mr-2" />
          系统设置
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <StaggerContainer className="max-w-3xl mx-auto space-y-6">
          <StaggerItem>
            <div className="card">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-sky-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800">个人资料</h2>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 bg-[#0D9488] text-white text-sm font-medium rounded-lg hover:bg-[#0F766E] transition-colors"
                  >
                    编辑
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Username (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">用户名</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-500 text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">用户名无法修改，如需帮助请联系管理员</p>
                </div>

                {/* Nickname */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">昵称</label>
                  <input
                    type="text"
                    value={profileForm.nickname}
                    onChange={(e) => handleProfileChange('nickname', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      isEditing
                        ? 'bg-white border-slate-200 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                    } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                    placeholder="显示名称"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">邮箱</label>
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      disabled={!isEditing}
                      className={`flex-1 px-4 py-3 rounded-lg border ${
                        isEditing
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                      } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                      placeholder="邮箱地址"
                    />
                  </div>
                </div>

                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">年龄</label>
                    <input
                      type="number"
                      value={profileForm.age}
                      onChange={(e) => handleProfileChange('age', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isEditing
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                      } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">性别</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => handleProfileChange('gender', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isEditing
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                      } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                    >
                      <option value="">选择性别</option>
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                </div>

                {/* Role Type & Occupation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">身份类型</label>
                    <select
                      value={profileForm.role_type}
                      onChange={(e) => handleProfileChange('role_type', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isEditing
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                      } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                    >
                      <option value="">选择身份</option>
                      <option value="elderly">老年人</option>
                      <option value="student">学生</option>
                      <option value="worker">上班族</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">职业</label>
                    <input
                      type="text"
                      value={profileForm.occupation}
                      onChange={(e) => handleProfileChange('occupation', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isEditing
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                      } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                      placeholder="您的职业"
                    />
                  </div>
                </div>

                {/* Education & Province */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">学历</label>
                    <input
                      type="text"
                      value={profileForm.education}
                      onChange={(e) => handleProfileChange('education', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isEditing
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                      } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                      placeholder="学历"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">省份</label>
                    <select
                      value={profileForm.province}
                      onChange={(e) => handleProfileChange('province', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isEditing
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                      } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                    >
                      <option value="">选择省份</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">城市</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => handleProfileChange('city', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      isEditing
                        ? 'bg-white border-slate-200 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-500 cursor-not-allowed'
                    } text-sm focus:outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 transition-all`}
                    placeholder="城市"
                  />
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <motion.div
                    className="flex gap-3 pt-4 border-t border-slate-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4 inline-block mr-2" />
                      取消
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 rounded-lg bg-[#0D9488] text-white font-medium hover:bg-[#0F766E] transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <CheckIcon className="w-4 h-4 inline-block mr-2" />
                      {isLoading ? '保存中...' : '保存更改'}
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <StaggerContainer className="max-w-3xl mx-auto space-y-6">
        {/* 通知设置 */}
        <StaggerItem>
          <div className="card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                <BellIcon className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">通知设置</h2>
            </div>
            <div className="space-y-4">
              <SettingRow
                label="推送通知"
                description="接收风险预警推送"
                type="toggle"
                value={settings.pushNotification}
                onChange={(v) => handleSettingChange('pushNotification', v as boolean)}
              />
              <SettingRow
                label="声音提醒"
                description="播放预警提示音"
                type="toggle"
                value={settings.soundAlert}
                onChange={(v) => handleSettingChange('soundAlert', v as boolean)}
              />
              <SettingRow
                label="震动提醒"
                description="启用震动反馈"
                type="toggle"
                value={settings.vibrateAlert}
                onChange={(v) => handleSettingChange('vibrateAlert', v as boolean)}
                isLast
              />
            </div>
          </div>
        </StaggerItem>

        {/* 安全设置 */}
        <StaggerItem>
          <div className="card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">安全设置</h2>
            </div>
            <div className="space-y-4">
              <SettingRow
                label="实时监控"
                description="监控通话和短信"
                type="toggle"
                value={settings.realtimeMonitor}
                onChange={(v) => handleSettingChange('realtimeMonitor', v as boolean)}
              />
              <SettingRow
                label="自动拦截"
                description="自动拦截高风险内容"
                type="toggle"
                value={settings.autoBlock}
                onChange={(v) => handleSettingChange('autoBlock', v as boolean)}
              />
              <SettingRow
                label="检测灵敏度"
                type="select"
                value={settings.sensitivity}
                options={[
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' },
                ]}
                onChange={(v) => handleSettingChange('sensitivity', v as 'low' | 'medium' | 'high')}
                isLast
              />
            </div>
          </div>
        </StaggerItem>

        {/* 守护设置 */}
        <StaggerItem>
          <div className="card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                <UserGroupIcon className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">守护设置</h2>
            </div>
            <div className="space-y-4">
              <SettingRow
                label="监护人通知"
                description="风险事件通知监护人"
                type="toggle"
                value={settings.guardianNotify}
                onChange={(v) => handleSettingChange('guardianNotify', v as boolean)}
              />
              <SettingRow
                label="紧急呼叫"
                description="启用一键求助"
                type="toggle"
                value={settings.emergencyCall}
                onChange={(v) => handleSettingChange('emergencyCall', v as boolean)}
                isLast
              />
            </div>
          </div>
        </StaggerItem>

        {/* 通用设置 */}
        <StaggerItem>
          <div className="card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                <Cog6ToothIcon className="w-5 h-5 text-sky-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">通用设置</h2>
            </div>
            <div className="space-y-4">
              <SettingRow
                label="字体大小"
                description="调整全局字体大小"
                type="select"
                value={settings.fontSize}
                options={[
                  { label: '标准', value: 'normal' },
                  { label: '大', value: 'large' },
                  { label: '超大', value: 'xlarge' },
                ]}
                onChange={(v) => handleSettingChange('fontSize', v as 'normal' | 'large' | 'xlarge')}
              />
              <SettingRow
                label="语言"
                type="select"
                value={settings.language}
                options={[
                  { label: '简体中文', value: 'zh' },
                  { label: 'English (Coming Soon)', value: 'en', disabled: true },
                ]}
                onChange={(v) => handleSettingChange('language', v as 'zh' | 'en')}
                isLast
              />
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>
      )}
    </div>
  );
}

// --------------- 设置行组件 ---------------
interface SettingRowProps {
  label: string;
  description?: string;
  type: 'toggle' | 'select';
  value: boolean | string;
  options?: { label: string; value: string; disabled?: boolean }[];
  onChange: (value: boolean | string) => void;
  isLast?: boolean;
}

function SettingRow({ label, description, type, value, options, onChange, isLast }: SettingRowProps) {
  return (
    <div className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-slate-200' : ''}`}>
      <div className="flex-1">
        <div className="font-medium text-slate-800">{label}</div>
        {description && <div className="text-sm text-slate-500 mt-0.5">{description}</div>}
      </div>

      {type === 'toggle' && (
        <button
          onClick={() => onChange(!value)}
          className={`switch ${value ? 'active' : ''}`}
        >
          <span className="switch-handle" />
        </button>
      )}

      {type === 'select' && options && (
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="select w-32 py-2"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

