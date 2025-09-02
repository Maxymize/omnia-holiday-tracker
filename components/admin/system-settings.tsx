'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Removed MagicToggle - using status buttons instead
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Eye, 
  CheckCircle, 
  Calendar,
  Users,
  Bell,
  Shield,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';
import { SystemSettings } from '@/lib/hooks/useAdminData';
import { LeaveTypeSettings } from './leave-type-settings';
import { LogoCustomization } from './logo-customization';
import { LoginLogoCustomization } from './login-logo-customization';
import { CompanyNameSetting } from './company-name-setting';

// Status Button Component
interface StatusButtonProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

// Define SettingCard outside to prevent re-creation on each render
const SettingCard = ({ 
  title, 
  description, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  description: string; 
  icon: any; 
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2 text-lg">
        <Icon className="h-5 w-5" />
        <span>{title}</span>
      </CardTitle>
      <p className="text-sm text-gray-600">{description}</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

const StatusButton = ({ enabled, onToggle, disabled }: StatusButtonProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle(true)}
        disabled={Boolean(disabled) || Boolean(enabled)}
        className={`${enabled 
          ? 'bg-green-600 hover:bg-green-700 text-white' 
          : 'hover:bg-green-50 hover:text-green-700 hover:border-green-200'
        }`}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        {t('admin.settings.statusButtons.enabled')}
      </Button>
      <Button
        variant={!enabled ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle(false)}
        disabled={Boolean(disabled) || Boolean(!enabled)}
        className={`${!enabled 
          ? 'bg-red-600 hover:bg-red-700 text-white' 
          : 'hover:bg-red-50 hover:text-red-700 hover:border-red-200'
        }`}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        {t('admin.settings.statusButtons.disabled')}
      </Button>
    </div>
  );
};

interface SystemSettingsProps {
  settings: Partial<SystemSettings>;
  loading: boolean;
  error: string | null;
  onUpdateSetting: (key: keyof SystemSettings, value: any) => Promise<boolean>;
  onRefresh: () => void;
}

const SystemSettingsComponent = memo(function SystemSettingsComponent({ 
  settings, 
  loading, 
  error, 
  onUpdateSetting, 
  onRefresh 
}: SystemSettingsProps) {
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState<Partial<SystemSettings>>({});
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local settings with props
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  // Create a stable company name save handler
  const handleCompanyNameSave = useCallback(async (newValue: string): Promise<boolean> => {
    return await onUpdateSetting('company.name', newValue);
  }, [onUpdateSetting]);

  const handleSaveSetting = async (key: keyof SystemSettings) => {
    const value = localSettings[key];
    if (value === settings[key]) return; // No change

    setSaveLoading(key);
    try {
      const success = await onUpdateSetting(key, value);
      if (success) {
        setHasChanges(false);
      }
    } finally {
      setSaveLoading(null);
    }
  };


  const handleSaveAll = async () => {
    setSaveLoading('all');
    try {
      const promises = Object.entries(localSettings)
        .filter(([key, value]) => value !== settings[key as keyof SystemSettings])
        .map(([key, value]) => onUpdateSetting(key as keyof SystemSettings, value));
      
      await Promise.all(promises);
      setHasChanges(false);
    } finally {
      setSaveLoading(null);
    }
  };


  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Settings className="h-6 w-6" />
            <span>{t('admin.settings.title')}</span>
          </h2>
          <p className="text-gray-600">
            {t('admin.settings.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={Boolean(loading)}>
            {t('admin.settings.refresh')}
          </Button>
          {hasChanges && (
            <Button 
              onClick={handleSaveAll} 
              disabled={Boolean(saveLoading === 'all')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveLoading === 'all' ? t('admin.settings.saving') : t('admin.settings.saveAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Changes Alert */}
      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t('admin.settings.alerts.hasChanges')}
          </AlertDescription>
        </Alert>
      )}

      {/* Company Name Settings - Full Width - Isolated Component */}
      <div className="mb-6">
        <CompanyNameSetting
          initialValue={settings['company.name']}
          onSave={handleCompanyNameSave}
        />
      </div>

      {/* Main Settings Grid - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Holiday Visibility Settings */}
        <SettingCard
          title={t('admin.settings.visibility.title')}
          description={t('admin.settings.visibility.description')}
          icon={Eye}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="visibility-mode">{t('admin.settings.visibility.mode')}</Label>
              <Select
                value={localSettings['holidays.visibility_mode'] || 'admin_only'}
                onValueChange={(value) => handleSettingChange('holidays.visibility_mode', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_see_all">{t('admin.settings.visibility.allSeeAll')}</SelectItem>
                  <SelectItem value="department_only">{t('admin.settings.visibility.departmentOnly')}</SelectItem>
                  <SelectItem value="admin_only">{t('admin.settings.visibility.adminOnly')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.settings.visibility.modeDescription')}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="show-names">{t('admin.settings.visibility.showNames')}</Label>
                <p className="text-xs text-gray-500">
                  {t('admin.settings.visibility.showNamesDescription')}
                </p>
              </div>
              <StatusButton
                enabled={localSettings['holidays.show_names'] ?? true}
                onToggle={(enabled) => handleSettingChange('holidays.show_names', enabled)}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="show-details">{t('admin.settings.visibility.showDetails')}</Label>
                <p className="text-xs text-gray-500">
                  {t('admin.settings.visibility.showDetailsDescription')}
                </p>
              </div>
              <StatusButton
                enabled={localSettings['holidays.show_details'] ?? true}
                onToggle={(enabled) => handleSettingChange('holidays.show_details', enabled)}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveSetting('holidays.visibility_mode')}
              disabled={Boolean(
                saveLoading === 'holidays.visibility_mode' ||
                localSettings['holidays.visibility_mode'] === settings['holidays.visibility_mode']
              )}
              className="w-full"
            >
              {saveLoading === 'holidays.visibility_mode' ? t('admin.settings.saving') : t('admin.settings.visibility.save')}
            </Button>
          </div>
        </SettingCard>

        {/* Approval Settings */}
        <SettingCard
          title={t('admin.settings.approval.title')}
          description={t('admin.settings.approval.description')}
          icon={CheckCircle}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-mode">{t('admin.settings.approval.mode')}</Label>
              <Select
                value={localSettings['holidays.approval_mode'] || 'manual'}
                onValueChange={(value) => handleSettingChange('holidays.approval_mode', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t('admin.settings.approval.manual')}</SelectItem>
                  <SelectItem value="auto">{t('admin.settings.approval.auto')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.settings.approval.modeDescription')}
              </p>
            </div>

            <div>
              <Label htmlFor="advance-notice">{t('admin.settings.approval.advanceNotice')}</Label>
              <Input
                id="advance-notice"
                type="number"
                min="0"
                max="365"
                value={localSettings['holidays.advance_notice_days'] || 7}
                onChange={(e) => handleSettingChange('holidays.advance_notice_days', parseInt(e.target.value) || 7)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.settings.approval.advanceNoticeDescription')}
              </p>
            </div>

            <div>
              <Label htmlFor="max-consecutive">{t('admin.settings.approval.maxConsecutive')}</Label>
              <Input
                id="max-consecutive"
                type="number"
                min="1"
                max="365"
                value={localSettings['holidays.max_consecutive_days'] || 30}
                onChange={(e) => handleSettingChange('holidays.max_consecutive_days', parseInt(e.target.value) || 30)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.settings.approval.maxConsecutiveDescription')}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveSetting('holidays.approval_mode')}
              disabled={Boolean(
                saveLoading === 'holidays.approval_mode' ||
                localSettings['holidays.approval_mode'] === settings['holidays.approval_mode']
              )}
              className="w-full"
            >
              {saveLoading === 'holidays.approval_mode' ? t('admin.settings.saving') : t('admin.settings.approval.save')}
            </Button>
          </div>
        </SettingCard>

        {/* System Settings */}
        <SettingCard
          title={t('admin.settings.system.title')}
          description={t('admin.settings.system.description')}
          icon={Shield}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="registration-enabled">{t('admin.settings.system.registration')}</Label>
                <p className="text-xs text-gray-500">
                  {t('admin.settings.system.registrationDescription')}
                </p>
              </div>
              <StatusButton
                enabled={localSettings['system.registration_enabled'] ?? true}
                onToggle={(enabled) => handleSettingChange('system.registration_enabled', enabled)}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="domain-restriction">{t('admin.settings.system.domainRestriction')}</Label>
                <p className="text-xs text-gray-500">
                  {t('admin.settings.system.domainRestrictionDescription')}
                </p>
              </div>
              <StatusButton
                enabled={localSettings['system.domain_restriction_enabled'] ?? true}
                onToggle={(enabled) => handleSettingChange('system.domain_restriction_enabled', enabled)}
              />
            </div>

            {/* Removed default holiday allowance - now managed in Leave Types Settings */}

            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setSaveLoading('all');
                try {
                  const systemKeys = [
                    'system.registration_enabled',
                    'system.domain_restriction_enabled'
                  ];
                  
                  const promises = systemKeys
                    .filter(key => localSettings[key as keyof SystemSettings] !== settings[key as keyof SystemSettings])
                    .map(key => onUpdateSetting(key as keyof SystemSettings, localSettings[key as keyof SystemSettings]));
                  
                  await Promise.all(promises);
                  setHasChanges(false);
                } finally {
                  setSaveLoading(null);
                }
              }}
              disabled={Boolean(
                saveLoading === 'all' ||
                (localSettings['system.registration_enabled'] === settings['system.registration_enabled'] &&
                 localSettings['system.domain_restriction_enabled'] === settings['system.domain_restriction_enabled'])
              )}
              className="w-full"
            >
              {saveLoading === 'all' ? t('admin.settings.saving') : t('admin.settings.system.save')}
            </Button>
          </div>
        </SettingCard>

        {/* Department Settings */}
        <SettingCard
          title={t('admin.settings.departments.title')}
          description={t('admin.settings.departments.description')}
          icon={Users}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="dept-visibility">{t('admin.settings.departments.visibility')}</Label>
                <p className="text-xs text-gray-500">
                  {t('admin.settings.departments.visibilityDescription')}
                </p>
              </div>
              <StatusButton
                enabled={localSettings['departments.visibility_enabled'] ?? true}
                onToggle={(enabled) => handleSettingChange('departments.visibility_enabled', enabled)}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="cross-dept">{t('admin.settings.departments.crossDepartment')}</Label>
                <p className="text-xs text-gray-500">
                  {t('admin.settings.departments.crossDepartmentDescription')}
                </p>
              </div>
              <StatusButton
                enabled={localSettings['departments.cross_department_view'] ?? false}
                onToggle={(enabled) => handleSettingChange('departments.cross_department_view', enabled)}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveSetting('departments.visibility_enabled')}
              disabled={Boolean(
                saveLoading === 'departments.visibility_enabled' ||
                (localSettings['departments.visibility_enabled'] === settings['departments.visibility_enabled'] &&
                 localSettings['departments.cross_department_view'] === settings['departments.cross_department_view'])
              )}
              className="w-full"
            >
              {saveLoading === 'departments.visibility_enabled' ? t('admin.settings.saving') : t('admin.settings.departments.save')}
            </Button>
          </div>
        </SettingCard>
      </div>

      {/* Notification Settings */}
      <div className="mt-6">
        <SettingCard
          title={t('admin.settings.notifications.title')}
          description={t('admin.settings.notifications.description')}
          icon={Bell}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="email-notifications">{t('admin.settings.notifications.email')}</Label>
                  <p className="text-xs text-gray-500">
                    {t('admin.settings.notifications.emailDescription')}
                  </p>
                </div>
                <StatusButton
                  enabled={localSettings['notifications.email_enabled'] ?? false}
                  onToggle={(enabled) => handleSettingChange('notifications.email_enabled', enabled)}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="browser-notifications">{t('admin.settings.notifications.browser')}</Label>
                  <p className="text-xs text-gray-500">
                    {t('admin.settings.notifications.browserDescription')}
                  </p>
                </div>
                <StatusButton
                  enabled={localSettings['notifications.browser_enabled'] ?? true}
                  onToggle={(enabled) => handleSettingChange('notifications.browser_enabled', enabled)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="manager-reminders">{t('admin.settings.notifications.managerReminders')}</Label>
                  <p className="text-xs text-gray-500">
                    {t('admin.settings.notifications.managerRemindersDescription')}
                  </p>
                </div>
                <StatusButton
                  enabled={localSettings['notifications.remind_managers'] ?? true}
                  onToggle={(enabled) => handleSettingChange('notifications.remind_managers', enabled)}
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaveSetting('notifications.email_enabled')}
                disabled={Boolean(
                  saveLoading === 'notifications.email_enabled' ||
                  (localSettings['notifications.email_enabled'] === settings['notifications.email_enabled'] &&
                   localSettings['notifications.browser_enabled'] === settings['notifications.browser_enabled'] &&
                   localSettings['notifications.remind_managers'] === settings['notifications.remind_managers'])
                )}
                className="w-full"
              >
                {saveLoading === 'notifications.email_enabled' ? t('admin.settings.saving') : t('admin.settings.notifications.save')}
              </Button>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* Logo Customization Section - Side by Side */}
      <div className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LogoCustomization />
          <LoginLogoCustomization />
        </div>
      </div>

      {/* Leave Type Settings - NEW SECTION */}
      <div className="mt-6">
        <LeaveTypeSettings />
      </div>
    </div>
  );
});

export { SystemSettingsComponent };