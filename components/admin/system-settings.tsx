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
import { TimezoneSettings } from './timezone-settings';

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
  onUpdateSetting: (key: string, value: any) => Promise<boolean>;
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

  const handleSettingChange = (key: string, value: any) => {
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

  const handleSaveSetting = async (key: string) => {
    const value = (localSettings as any)[key];
    if (value === (settings as any)[key]) return; // No change

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

      {/* Email Notification Settings */}
      <div className="mt-6">
        <SettingCard
          title={t('admin.settings.notifications.title')}
          description={t('admin.settings.notifications.description')}
          icon={Bell}
        >
          <div className="space-y-8">
            {/* Admin Notifications Section */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t('admin.settings.notifications.adminNotifications')}
                  </h4>
                  <p className="text-sm text-gray-600">Notifiche inviate agli amministratori</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Employee Registration */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <Label className="text-sm font-medium text-gray-900">
                        {t('admin.settings.notifications.employeeRegistration')}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      {t('admin.settings.notifications.employeeRegistrationDescription')}
                    </p>
                  </div>
                  <StatusButton
                    enabled={(localSettings as any)['notifications.employee_registration'] ?? true}
                    onToggle={(enabled) => handleSettingChange('notifications.employee_registration', enabled)}
                  />
                </div>

                {/* Holiday Request Submitted */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <Label className="text-sm font-medium text-gray-900">
                        {t('admin.settings.notifications.holidayRequestSubmitted')}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      {t('admin.settings.notifications.holidayRequestSubmittedDescription')}
                    </p>
                  </div>
                  <StatusButton
                    enabled={(localSettings as any)['notifications.holiday_request_submitted'] ?? true}
                    onToggle={(enabled) => handleSettingChange('notifications.holiday_request_submitted', enabled)}
                  />
                </div>

                {/* Holiday Starting Reminder */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <Label className="text-sm font-medium text-gray-900">
                        {t('admin.settings.notifications.holidayStartingReminder')}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      {t('admin.settings.notifications.holidayStartingReminderDescription')}
                    </p>
                  </div>
                  <StatusButton
                    enabled={(localSettings as any)['notifications.holiday_starting_reminder'] ?? true}
                    onToggle={(enabled) => handleSettingChange('notifications.holiday_starting_reminder', enabled)}
                  />
                </div>
              </div>
            </div>

            {/* Employee Notifications Section */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t('admin.settings.notifications.employeeNotifications')}
                  </h4>
                  <p className="text-sm text-gray-600">Notifiche inviate ai dipendenti</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Employee Approved */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <Label className="text-sm font-medium text-gray-900">
                        {t('admin.settings.notifications.employeeApproved')}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      {t('admin.settings.notifications.employeeApprovedDescription')}
                    </p>
                  </div>
                  <StatusButton
                    enabled={(localSettings as any)['notifications.employee_approved'] ?? true}
                    onToggle={(enabled) => handleSettingChange('notifications.employee_approved', enabled)}
                  />
                </div>

                {/* Holiday Request Approved */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <Label className="text-sm font-medium text-gray-900">
                        {t('admin.settings.notifications.holidayRequestApproved')}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      {t('admin.settings.notifications.holidayRequestApprovedDescription')}
                    </p>
                  </div>
                  <StatusButton
                    enabled={(localSettings as any)['notifications.holiday_request_approved'] ?? true}
                    onToggle={(enabled) => handleSettingChange('notifications.holiday_request_approved', enabled)}
                  />
                </div>

                {/* Holiday Request Rejected */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <Label className="text-sm font-medium text-gray-900">
                        {t('admin.settings.notifications.holidayRequestRejected')}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      {t('admin.settings.notifications.holidayRequestRejectedDescription')}
                    </p>
                  </div>
                  <StatusButton
                    enabled={(localSettings as any)['notifications.holiday_request_rejected'] ?? true}
                    onToggle={(enabled) => handleSettingChange('notifications.holiday_request_rejected', enabled)}
                  />
                </div>
              </div>
            </div>

            {/* General Settings Section */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t('admin.settings.notifications.generalSettings')}
                  </h4>
                  <p className="text-sm text-gray-600">Impostazioni generali del sistema di notifiche</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Browser Notifications */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                      <Label className="text-sm font-medium text-gray-900">
                        {t('admin.settings.notifications.browser')}
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 pl-6">
                      {t('admin.settings.notifications.browserDescription')}
                    </p>
                  </div>
                  <StatusButton
                    enabled={(localSettings as any)['notifications.browser_enabled'] ?? true}
                    onToggle={(enabled) => handleSettingChange('notifications.browser_enabled', enabled)}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-200">
              <Button
                size="lg"
                variant="default"
                onClick={() => handleSaveSetting('notifications.employee_registration')}
                disabled={Boolean(
                  saveLoading === 'notifications.employee_registration' ||
                  ((localSettings as any)['notifications.employee_registration'] === (settings as any)['notifications.employee_registration'] &&
                   (localSettings as any)['notifications.holiday_request_submitted'] === (settings as any)['notifications.holiday_request_submitted'] &&
                   (localSettings as any)['notifications.holiday_starting_reminder'] === (settings as any)['notifications.holiday_starting_reminder'] &&
                   (localSettings as any)['notifications.employee_approved'] === (settings as any)['notifications.employee_approved'] &&
                   (localSettings as any)['notifications.holiday_request_approved'] === (settings as any)['notifications.holiday_request_approved'] &&
                   (localSettings as any)['notifications.holiday_request_rejected'] === (settings as any)['notifications.holiday_request_rejected'] &&
                   (localSettings as any)['notifications.browser_enabled'] === (settings as any)['notifications.browser_enabled'])
                )}
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saveLoading === 'notifications.employee_registration' ? t('admin.settings.saving') : t('admin.settings.notifications.save')}
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

      {/* Timezone Settings - NEW SECTION */}
      <div className="mt-6">
        <TimezoneSettings />
      </div>

      {/* Leave Type Settings - NEW SECTION */}
      <div className="mt-6">
        <LeaveTypeSettings />
      </div>
    </div>
  );
});

export { SystemSettingsComponent };