'use client';

import { useState, useEffect } from 'react';
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

// Status Button Component
interface StatusButtonProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

const StatusButton = ({ enabled, onToggle, disabled }: StatusButtonProps) => (
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
      Abilitato
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
      Disabilitato
    </Button>
  </div>
);

interface SystemSettingsProps {
  settings: Partial<SystemSettings>;
  loading: boolean;
  error: string | null;
  onUpdateSetting: (key: keyof SystemSettings, value: any) => Promise<boolean>;
  onRefresh: () => void;
}

export function SystemSettingsComponent({ 
  settings, 
  loading, 
  error, 
  onUpdateSetting, 
  onRefresh 
}: SystemSettingsProps) {
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
            <span>Impostazioni Sistema</span>
          </h2>
          <p className="text-gray-600">
            Configura il comportamento del sistema e le preferenze per tutti gli utenti
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={Boolean(loading)}>
            Aggiorna
          </Button>
          {hasChanges && (
            <Button 
              onClick={handleSaveAll} 
              disabled={Boolean(saveLoading === 'all')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveLoading === 'all' ? 'Salvando...' : 'Salva Tutte'}
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
            Hai modifiche non salvate. Clicca &quot;Salva Tutte&quot; per applicare tutte le modifiche.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Holiday Visibility Settings */}
        <SettingCard
          title="Visibilità Ferie"
          description="Controlla chi può vedere le ferie degli altri dipendenti"
          icon={Eye}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="visibility-mode">Modalità Visibilità</Label>
              <Select
                value={localSettings['holidays.visibility_mode'] || 'admin_only'}
                onValueChange={(value) => handleSettingChange('holidays.visibility_mode', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_see_all">Tutti vedono tutto</SelectItem>
                  <SelectItem value="department_only">Solo il dipartimento</SelectItem>
                  <SelectItem value="admin_only">Solo amministratori</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Chi può vedere le ferie degli altri dipendenti nel calendario
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="show-names">Mostra Nomi</Label>
                <p className="text-xs text-gray-500">
                  Mostra i nomi dei dipendenti negli eventi del calendario
                </p>
              </div>
              <StatusButton
                enabled={localSettings['holidays.show_names'] ?? true}
                onToggle={(enabled) => handleSettingChange('holidays.show_names', enabled)}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="show-details">Mostra Dettagli</Label>
                <p className="text-xs text-gray-500">
                  Mostra dettagli delle ferie (tipo, note) negli eventi
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
              {saveLoading === 'holidays.visibility_mode' ? 'Salvando...' : 'Salva Visibilità'}
            </Button>
          </div>
        </SettingCard>

        {/* Approval Settings */}
        <SettingCard
          title="Approvazioni"
          description="Gestisci come vengono approvate le richieste di ferie"
          icon={CheckCircle}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-mode">Modalità Approvazione</Label>
              <Select
                value={localSettings['holidays.approval_mode'] || 'manual'}
                onValueChange={(value) => handleSettingChange('holidays.approval_mode', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Approvazione manuale</SelectItem>
                  <SelectItem value="auto">Approvazione automatica</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Come vengono gestite le richieste di ferie
              </p>
            </div>

            <div>
              <Label htmlFor="advance-notice">Giorni di Preavviso</Label>
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
                Giorni minimi di preavviso richiesti per le ferie
              </p>
            </div>

            <div>
              <Label htmlFor="max-consecutive">Giorni Consecutivi Massimi</Label>
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
                Numero massimo di giorni consecutivi di ferie
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
              {saveLoading === 'holidays.approval_mode' ? 'Salvando...' : 'Salva Approvazioni'}
            </Button>
          </div>
        </SettingCard>

        {/* System Settings */}
        <SettingCard
          title="Sistema"
          description="Configurazioni generali del sistema"
          icon={Shield}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="registration-enabled">Registrazione</Label>
                <p className="text-xs text-gray-500">
                  Permetti a nuovi dipendenti di registrarsi
                </p>
              </div>
              <StatusButton
                enabled={localSettings['system.registration_enabled'] ?? true}
                onToggle={(enabled) => handleSettingChange('system.registration_enabled', enabled)}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="domain-restriction">Limitazione Domini Email</Label>
                <p className="text-xs text-gray-500">
                  Limita registrazioni solo ai domini OmniaGroup (omniaservices.net, omniaelectronics.com)
                </p>
              </div>
              <StatusButton
                enabled={localSettings['system.domain_restriction_enabled'] ?? true}
                onToggle={(enabled) => handleSettingChange('system.domain_restriction_enabled', enabled)}
              />
            </div>

            <div>
              <Label htmlFor="default-allowance">Giorni Ferie Predefiniti</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="default-allowance"
                  type="number"
                  min="0"
                  max="365"
                  value={localSettings['system.default_holiday_allowance'] || 20}
                  onChange={(e) => handleSettingChange('system.default_holiday_allowance', parseInt(e.target.value) || 20)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    console.log('🔧 Apply to all button clicked');
                    const currentAllowance = localSettings['system.default_holiday_allowance'] || 20;
                    
                    // First save the current setting to make sure database is updated
                    console.log('🔧 Saving setting first to ensure database sync');
                    await handleSaveSetting('system.default_holiday_allowance');
                    
                    if (confirm(`Vuoi applicare ${currentAllowance} giorni di ferie a TUTTI i dipendenti esistenti? Questa azione non può essere annullata.`)) {
                      try {
                        const token = localStorage.getItem('accessToken');
                        const baseUrl = process.env.NODE_ENV === 'development' 
                          ? 'http://localhost:3000' 
                          : window.location.origin;
                        
                        const response = await fetch(`${baseUrl}/.netlify/functions/apply-default-allowance`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          }
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                          alert(`✅ Successo! Applicati ${result.data.defaultAllowance} giorni a ${result.data.updatedCount} dipendenti.`);
                          if (onRefresh) onRefresh(); // Refresh the page data
                        } else {
                          alert(`❌ Errore: ${result.error}`);
                        }
                      } catch (error) {
                        console.error('Apply default allowance error:', error);
                        alert('❌ Errore durante l\'applicazione dei giorni predefiniti');
                      }
                    }
                  }}
                  className="text-blue-600 hover:text-blue-700 border-blue-300"
                >
                  Applica a Tutti
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Giorni di ferie assegnati ai nuovi dipendenti. Usa "Applica a Tutti" per aggiornare anche i dipendenti esistenti.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setSaveLoading('all');
                try {
                  const systemKeys = [
                    'system.registration_enabled',
                    'system.domain_restriction_enabled', 
                    'system.default_holiday_allowance'
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
                 localSettings['system.domain_restriction_enabled'] === settings['system.domain_restriction_enabled'] &&
                 localSettings['system.default_holiday_allowance'] === settings['system.default_holiday_allowance'])
              )}
              className="w-full"
            >
              {saveLoading === 'all' ? 'Salvando...' : 'Salva Sistema'}
            </Button>
          </div>
        </SettingCard>

        {/* Department Settings */}
        <SettingCard
          title="Dipartimenti"
          description="Gestisci l'organizzazione dei dipartimenti"
          icon={Users}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="dept-visibility">Visibilità Dipartimenti</Label>
                <p className="text-xs text-gray-500">
                  I dipendenti possono vedere i colleghi del loro dipartimento
                </p>
              </div>
              <StatusButton
                enabled={localSettings['departments.visibility_enabled'] ?? true}
                onToggle={(enabled) => handleSettingChange('departments.visibility_enabled', enabled)}
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="cross-dept">Vista Inter-Dipartimentale</Label>
                <p className="text-xs text-gray-500">
                  Permetti ai dipendenti di vedere altri dipartimenti
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
              {saveLoading === 'departments.visibility_enabled' ? 'Salvando...' : 'Salva Dipartimenti'}
            </Button>
          </div>
        </SettingCard>

        {/* Notification Settings */}
        <div className="lg:col-span-2">
          <SettingCard
            title="Notifiche"
            description="Configura come vengono inviate le notifiche agli utenti"
            icon={Bell}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="email-notifications">Email</Label>
                    <p className="text-xs text-gray-500">
                      Invia notifiche via email per approvazioni e aggiornamenti
                    </p>
                  </div>
                  <StatusButton
                    enabled={localSettings['notifications.email_enabled'] ?? false}
                    onToggle={(enabled) => handleSettingChange('notifications.email_enabled', enabled)}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="browser-notifications">Notifiche Browser</Label>
                    <p className="text-xs text-gray-500">
                      Mostra notifiche nel browser per eventi importanti
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
                    <Label htmlFor="manager-reminders">Promemoria Manager</Label>
                    <p className="text-xs text-gray-500">
                      Invia promemoria ai manager per richieste pendenti
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
                  {saveLoading === 'notifications.email_enabled' ? 'Salvando...' : 'Salva Notifiche'}
                </Button>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  );
}