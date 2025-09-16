'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, MapPin, Clock, Info, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { LiveClock } from '@/components/ui/live-clock';

// Status Button Component (same as in system-settings)
interface StatusButtonProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const StatusButton = ({ enabled, onToggle, disabled, label }: StatusButtonProps) => {
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
        {label || t('admin.settings.statusButtons.enabled')}
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
        {label || t('admin.settings.statusButtons.disabled')}
      </Button>
    </div>
  );
};

interface TimezoneSettingsProps {
  className?: string;
}

export function TimezoneSettings({ className = '' }: TimezoneSettingsProps) {
  const { t } = useTranslation();
  const [selectedTimezone, setSelectedTimezone] = useState<string>('auto');
  const [showFullTimezone, setShowFullTimezone] = useState<boolean>(false);
  const [showTimezoneIndicator, setShowTimezoneIndicator] = useState<boolean>(true);
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Get translated timezone options
  const getTimezoneOptions = () => [
    { value: 'auto', label: t('admin.settings.timezone.timezones.auto'), region: t('admin.settings.timezone.regions.auto') },
    { value: 'Europe/Rome', label: t('admin.settings.timezone.timezones.europeRome'), region: t('admin.settings.timezone.regions.europe') },
    { value: 'Europe/London', label: t('admin.settings.timezone.timezones.europeLondon'), region: t('admin.settings.timezone.regions.europe') },
    { value: 'Europe/Paris', label: t('admin.settings.timezone.timezones.europeParis'), region: t('admin.settings.timezone.regions.europe') },
    { value: 'Europe/Berlin', label: t('admin.settings.timezone.timezones.europeBerlin'), region: t('admin.settings.timezone.regions.europe') },
    { value: 'Europe/Madrid', label: t('admin.settings.timezone.timezones.europeMadrid'), region: t('admin.settings.timezone.regions.europe') },
    { value: 'America/New_York', label: t('admin.settings.timezone.timezones.americaNewYork'), region: t('admin.settings.timezone.regions.northAmerica') },
    { value: 'America/Los_Angeles', label: t('admin.settings.timezone.timezones.americaLosAngeles'), region: t('admin.settings.timezone.regions.northAmerica') },
    { value: 'America/Chicago', label: t('admin.settings.timezone.timezones.americaChicago'), region: t('admin.settings.timezone.regions.northAmerica') },
    { value: 'Asia/Tokyo', label: t('admin.settings.timezone.timezones.asiaTokyo'), region: t('admin.settings.timezone.regions.asia') },
    { value: 'Asia/Shanghai', label: t('admin.settings.timezone.timezones.asiaShanghai'), region: t('admin.settings.timezone.regions.asia') },
    { value: 'Asia/Dubai', label: t('admin.settings.timezone.timezones.asiaDubai'), region: t('admin.settings.timezone.regions.asia') },
    { value: 'Australia/Sydney', label: t('admin.settings.timezone.timezones.australiaSydney'), region: t('admin.settings.timezone.regions.oceania') },
  ];

  // Detect browser timezone on startup
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetectedTimezone(detected);

    // Load saved settings from localStorage
    const savedTimezone = localStorage.getItem('timezone-setting');
    const savedShowFull = localStorage.getItem('timezone-show-full');
    const savedShowIndicator = localStorage.getItem('timezone-show-indicator');

    if (savedTimezone) {
      setSelectedTimezone(savedTimezone);
    }
    if (savedShowFull) {
      setShowFullTimezone(savedShowFull === 'true');
    }
    if (savedShowIndicator) {
      setShowTimezoneIndicator(savedShowIndicator === 'true');
    }
  }, []);

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('timezone-setting', selectedTimezone);
      localStorage.setItem('timezone-show-full', showFullTimezone.toString());
      localStorage.setItem('timezone-show-indicator', showTimezoneIndicator.toString());

      // Emit custom event to notify other components
      window.dispatchEvent(new CustomEvent('timezone-settings-updated'));

      // Simulate server save (for future use if needed)
      await new Promise(resolve => setTimeout(resolve, 800));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving timezone settings:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const getTimezoneForPreview = () => {
    return selectedTimezone === 'auto' ? undefined : selectedTimezone;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Clock className="h-5 w-5" />
          <span>{t('admin.settings.timezone.title')}</span>
        </CardTitle>
        <p className="text-sm text-gray-600">{t('admin.settings.timezone.description')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Timezone Selection */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="timezone-select">{t('admin.settings.timezone.timezoneSelection')}</Label>
              <p className="text-xs text-gray-500">{t('admin.settings.timezone.timezoneSelectionDescription')}</p>
              <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getTimezoneOptions().map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <div className="flex items-center space-x-2">
                        {tz.value === 'auto' ? (
                          <Globe className="h-4 w-4 text-green-600" />
                        ) : (
                          <MapPin className="h-4 w-4 text-blue-600" />
                        )}
                        <div>
                          <div className="font-medium">{tz.label}</div>
                          <div className="text-xs text-gray-500">{tz.region}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTimezone === 'auto' && (
                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('admin.settings.timezone.autoDetection')}</strong>
                    <br />
                    {t('admin.settings.timezone.autoDetectionDescription')} <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{detectedTimezone}</code>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <Label className="text-sm font-medium text-gray-900 mb-2 block">
                {t('admin.settings.timezone.preview')}
              </Label>
              <div className="flex justify-center">
                <LiveClock
                  compact={true}
                  showTimezone={true}
                  showFullTimezone={showFullTimezone}
                  showTimezoneIndicator={showTimezoneIndicator}
                  manualTimezone={getTimezoneForPreview()}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Display Options */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>{t('admin.settings.timezone.displayOptions')}</Label>
              <p className="text-xs text-gray-500">{t('admin.settings.timezone.displayOptionsDescription')}</p>

              {/* Full timezone name option */}
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('admin.settings.timezone.fullTimezoneName')}
                  </Label>
                  <p className="text-xs text-gray-500">
                    {t('admin.settings.timezone.fullTimezoneNameDescription')}
                  </p>
                  <StatusButton
                    enabled={showFullTimezone}
                    onToggle={setShowFullTimezone}
                  />
                </div>
              </div>

              {/* Visual indicators option */}
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('admin.settings.timezone.visualIndicators')}
                  </Label>
                  <p className="text-xs text-gray-500">
                    {t('admin.settings.timezone.visualIndicatorsDescription')}
                  </p>
                  <StatusButton
                    enabled={showTimezoneIndicator}
                    onToggle={setShowTimezoneIndicator}
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('admin.settings.timezone.howItWorks')}</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                  <li>{t('admin.settings.timezone.automaticMode')}</li>
                  <li>{t('admin.settings.timezone.manualMode')}</li>
                  <li>{t('admin.settings.timezone.indicatorsMode')}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-6 border-t">
          <Button
            onClick={handleSaveSettings}
            disabled={saveLoading}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveLoading ? t('admin.settings.timezone.saving') : t('admin.settings.timezone.saveSettings')}
          </Button>

          {saveSuccess && (
            <Alert className="mt-3 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t('admin.settings.timezone.saveSuccess')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}