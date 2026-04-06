import { ScrollReveal, StaggerContainer, StaggerItem } from '../components/motion';
import {
  BellIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useSettingsStore, type AppSettings } from '../store/settingsStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { settings, updateSetting } = useSettingsStore();

  // 处理设置变更并自动保存
  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSetting(key, value);
  };

  const handleSave = () => {
    toast.success('设置已保存');
  };

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div className="content-header">
          <h1 className="page-title">系统设置</h1>
          <p className="page-subtitle">管理您的偏好和安全选项，设置会自动保存</p>
        </div>
      </ScrollReveal>

      <StaggerContainer className="max-w-3xl space-y-6">
        {/* 通知设置 */}
        <StaggerItem>
          <div className="card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
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
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
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
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
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
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
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

        {/* 保存按钮 */}
        <StaggerItem>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={handleSave}>
              <CheckIcon className="w-5 h-5" />
              确认保存
            </button>
          </div>
        </StaggerItem>
      </StaggerContainer>
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
    <div className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-slate-100' : ''}`}>
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

