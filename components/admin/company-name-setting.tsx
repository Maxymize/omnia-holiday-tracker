'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Save } from 'lucide-react';

interface CompanyNameSettingProps {
  initialValue?: string;
  onSave?: (value: string) => Promise<boolean>;
}

export function CompanyNameSetting({ initialValue, onSave }: CompanyNameSettingProps) {
  const [value, setValue] = useState(initialValue || 'OmniaGroup');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only update when initialValue actually changes
  useEffect(() => {
    if (initialValue && initialValue !== value) {
      setValue(initialValue);
      setHasChanges(false);
    }
  }, [initialValue]); // Note: Not including 'value' to prevent loops

  // Stable change handler
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setHasChanges(newValue !== (initialValue || 'OmniaGroup'));
  }, [initialValue]);

  // Stable save handler
  const handleSave = useCallback(async () => {
    if (!onSave || !hasChanges) return;

    setSaving(true);
    try {
      const success = await onSave(value);
      if (success) {
        setHasChanges(false);
      }
    } finally {
      setSaving(false);
    }
  }, [onSave, hasChanges, value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Building2 className="h-5 w-5" />
          <span>Nome Azienda</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Configura il nome dell'azienda che apparirà in tutta la piattaforma
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="company-name">Nome Azienda</Label>
          <Input
            ref={inputRef}
            id="company-name"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Es. OmniaGroup, Acme Corp, etc."
            className="mt-1"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            Questo nome apparirà in tutti i messaggi, policy e riferimenti aziendali
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-gray-500">
            Modifica in sospeso: {hasChanges ? 'Sì' : 'No'}
          </span>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-3 w-3 mr-1" />
            {saving ? 'Salvando...' : 'Salva'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}