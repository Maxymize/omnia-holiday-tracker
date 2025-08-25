'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Save,
  AlertTriangle,
  Info,
  Clock,
  Heart,
  User,
  Users,
  RotateCcw
} from 'lucide-react';
import { toast } from '@/lib/utils/toast';

// Leave type configuration interface
interface LeaveTypeAllowances {
  'leave_types.vacation_allowance': number;
  'leave_types.personal_allowance': number;
  'leave_types.sick_allowance': number;
}

interface LeaveTypeSettingsProps {
  className?: string;
}

export function LeaveTypeSettings({ className }: LeaveTypeSettingsProps) {
  // State management
  const [allowances, setAllowances] = useState<LeaveTypeAllowances>({
    'leave_types.vacation_allowance': 20,
    'leave_types.personal_allowance': 10,
    'leave_types.sick_allowance': -1
  });
  
  const [originalAllowances, setOriginalAllowances] = useState<LeaveTypeAllowances>({
    'leave_types.vacation_allowance': 20,
    'leave_types.personal_allowance': 10,
    'leave_types.sick_allowance': -1
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Check for changes whenever allowances change
  useEffect(() => {
    const changed = Object.keys(allowances).some(
      key => allowances[key as keyof LeaveTypeAllowances] !== originalAllowances[key as keyof LeaveTypeAllowances]
    );
    setHasChanges(changed);
  }, [allowances, originalAllowances]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/get-settings?keys=leave_types.vacation_allowance,leave_types.personal_allowance,leave_types.sick_allowance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        const settings = result.settings;
        const loadedAllowances: LeaveTypeAllowances = {
          'leave_types.vacation_allowance': parseInt(settings['leave_types.vacation_allowance'] || '20'),
          'leave_types.personal_allowance': parseInt(settings['leave_types.personal_allowance'] || '10'),
          'leave_types.sick_allowance': parseInt(settings['leave_types.sick_allowance'] || '-1')
        };
        
        setAllowances(loadedAllowances);
        setOriginalAllowances(loadedAllowances);
        setErrors({});
      } else {
        toast.error('Errore', 'Impossibile caricare le impostazioni');
        console.error('Load settings error:', result.error);
      }
    } catch (error) {
      console.error('Load settings error:', error);
      toast.error('Errore di Connessione', 'Errore durante il caricamento delle impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const validateInput = (key: keyof LeaveTypeAllowances, value: number): string | null => {
    if (key === 'leave_types.sick_allowance') {
      // Sick days can be -1 (unlimited) or any positive number
      if (value < -1) {
        return 'I giorni di malattia devono essere -1 (illimitati) o un numero positivo';
      }
    } else {
      // Vacation and personal days must be positive
      if (value < 1) {
        return 'Il valore deve essere almeno 1 giorno';
      }
      if (value > 365) {
        return 'Il valore non può superare 365 giorni';
      }
    }
    return null;
  };

  const handleAllowanceChange = (key: keyof LeaveTypeAllowances, value: string) => {
    const numValue = parseInt(value) || 0;
    
    // Validate input
    const error = validateInput(key, numValue);
    setErrors(prev => ({
      ...prev,
      [key]: error || ''
    }));

    // Update allowance if valid
    if (!error) {
      setAllowances(prev => ({
        ...prev,
        [key]: numValue
      }));
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // Final validation before saving
      const validationErrors: Record<string, string> = {};
      Object.keys(allowances).forEach(key => {
        const error = validateInput(key as keyof LeaveTypeAllowances, allowances[key as keyof LeaveTypeAllowances]);
        if (error) validationErrors[key] = error;
      });

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast.error('Errore di Validazione', 'Correggi gli errori prima di salvare');
        return;
      }

      const token = localStorage.getItem('accessToken');
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin;

      // Prepare settings update payload
      const settingsToUpdate = Object.entries(allowances)
        .filter(([key, value]) => value !== originalAllowances[key as keyof LeaveTypeAllowances])
        .map(([key, value]) => ({
          key,
          value: value.toString()
        }));

      if (settingsToUpdate.length === 0) {
        toast.info('Nessuna Modifica', 'Non ci sono modifiche da salvare');
        return;
      }

      const response = await fetch(`${baseUrl}/.netlify/functions/update-settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: settingsToUpdate })
      });

      const result = await response.json();
      
      if (result.success) {
        setOriginalAllowances({ ...allowances });
        setHasChanges(false);
        setErrors({});
        
        toast.success(
          'Impostazioni Salvate', 
          `Aggiornati ${settingsToUpdate.length} tipi di permesso`
        );
      } else {
        toast.error('Errore di Salvataggio', result.error || 'Impossibile salvare le impostazioni');
        console.error('Save settings error:', result.error);
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Errore di Connessione', 'Errore durante il salvataggio delle impostazioni');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setAllowances({ ...originalAllowances });
    setErrors({});
    setHasChanges(false);
    toast.info('Modifiche Annullate', 'Ripristinati i valori originali');
  };

  const formatSickDaysDisplay = (days: number): string => {
    return days === -1 ? 'Illimitati' : `${days} giorni`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-xl">
          <Calendar className="h-6 w-6 text-blue-600" />
          <span>Configurazione Tipi di Permesso</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Configura i giorni di permesso annuali per categoria. Queste impostazioni si applicano a tutti i dipendenti.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Change notification */}
        {hasChanges && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Hai modifiche non salvate. Clicca &quot;Salva Impostazioni&quot; per applicarle a tutto il sistema.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Vacation Days */}
          <div className="space-y-3 p-4 border rounded-lg bg-green-50/50 border-green-200">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <Label className="text-base font-semibold text-green-900">
                Giorni di Ferie (Vacation Days)
              </Label>
            </div>
            <p className="text-sm text-green-700 ml-7">
              Giorni di ferie annuali standard per tutti i dipendenti
            </p>
            
            <div className="ml-7 space-y-2">
              <Input
                type="number"
                min="1"
                max="365"
                value={allowances['leave_types.vacation_allowance']}
                onChange={(e) => handleAllowanceChange('leave_types.vacation_allowance', e.target.value)}
                className={`w-32 ${errors['leave_types.vacation_allowance'] ? 'border-red-500' : ''}`}
                placeholder="20"
              />
              {errors['leave_types.vacation_allowance'] && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{errors['leave_types.vacation_allowance']}</span>
                </p>
              )}
              <p className="text-xs text-green-600">
                Valore attuale: {allowances['leave_types.vacation_allowance']} giorni all&apos;anno
              </p>
            </div>
          </div>

          <Separator />

          {/* Personal Days */}
          <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50 border-blue-200">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <Label className="text-base font-semibold text-blue-900">
                Giorni di Permesso (Personal Days)
              </Label>
            </div>
            <p className="text-sm text-blue-700 ml-7">
              Giorni di permesso personale annuali (ROL, permessi retribuiti, ecc.)
            </p>
            
            <div className="ml-7 space-y-2">
              <Input
                type="number"
                min="1"
                max="365"
                value={allowances['leave_types.personal_allowance']}
                onChange={(e) => handleAllowanceChange('leave_types.personal_allowance', e.target.value)}
                className={`w-32 ${errors['leave_types.personal_allowance'] ? 'border-red-500' : ''}`}
                placeholder="10"
              />
              {errors['leave_types.personal_allowance'] && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{errors['leave_types.personal_allowance']}</span>
                </p>
              )}
              <p className="text-xs text-blue-600">
                Valore attuale: {allowances['leave_types.personal_allowance']} giorni all&apos;anno
              </p>
            </div>
          </div>

          <Separator />

          {/* Sick Days */}
          <div className="space-y-3 p-4 border rounded-lg bg-red-50/50 border-red-200">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <Label className="text-base font-semibold text-red-900">
                Giorni di Malattia (Sick Days)
              </Label>
            </div>
            <p className="text-sm text-red-700 ml-7">
              Giorni di malattia annuali. Usa -1 per giorni illimitati (con documentazione medica)
            </p>
            
            <div className="ml-7 space-y-2">
              <div className="flex items-center space-x-3">
                <Input
                  type="number"
                  min="-1"
                  max="365"
                  value={allowances['leave_types.sick_allowance']}
                  onChange={(e) => handleAllowanceChange('leave_types.sick_allowance', e.target.value)}
                  className={`w-32 ${errors['leave_types.sick_allowance'] ? 'border-red-500' : ''}`}
                  placeholder="-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAllowanceChange('leave_types.sick_allowance', '-1')}
                  className="text-xs"
                >
                  Imposta Illimitato
                </Button>
              </div>
              
              {errors['leave_types.sick_allowance'] && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{errors['leave_types.sick_allowance']}</span>
                </p>
              )}
              
              <div className="text-xs text-red-600 space-y-1">
                <p>
                  Valore attuale: {formatSickDaysDisplay(allowances['leave_types.sick_allowance'])}
                </p>
                <p className="italic">
                  Nota: -1 = illimitato con documentazione medica; numeri positivi = limite annuale
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Apply to All Employees Section */}
        <Separator />

        <div className="space-y-4 p-4 border rounded-lg bg-amber-50/50 border-amber-200">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-amber-600" />
            <Label className="text-base font-semibold text-amber-900">
              Applica Impostazioni a Tutti i Dipendenti
            </Label>
          </div>
          
          <p className="text-sm text-amber-700">
            Applica le nuove configurazioni dei giorni di permesso a tutti i dipendenti esistenti nel sistema.
          </p>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Attenzione:</strong> Questa azione aggiornerà i giorni di permesso per tutti i dipendenti esistenti
              con i nuovi valori configurati. I dipendenti che hanno già utilizzato giorni di permesso manterranno
              il loro utilizzo corrente.
            </AlertDescription>
          </Alert>

          <Button
            variant="outline" 
            onClick={async () => {
              try {
                const token = localStorage.getItem('accessToken');
                const baseUrl = process.env.NODE_ENV === 'development' 
                  ? 'http://localhost:3000' 
                  : window.location.origin;

                const response = await fetch(`${baseUrl}/.netlify/functions/apply-allowances-to-all`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    vacationAllowance: allowances['leave_types.vacation_allowance'],
                    personalAllowance: allowances['leave_types.personal_allowance'], 
                    sickAllowance: allowances['leave_types.sick_allowance']
                  })
                });

                const result = await response.json();
                
                if (result.success) {
                  toast.success(
                    'Applicazione Completata',
                    `Aggiornati ${result.updatedEmployees || 0} dipendenti con le nuove impostazioni`
                  );
                } else {
                  toast.error('Errore di Applicazione', result.error || 'Impossibile applicare le impostazioni');
                }
              } catch (error) {
                console.error('Apply to all employees error:', error);
                toast.error('Errore di Connessione', 'Errore durante l&apos;applicazione delle impostazioni');
              }
            }}
            disabled={saving || !hasChanges}
            className="w-full sm:w-auto border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <Users className="h-4 w-4 mr-2" />
            Applica a Tutti i Dipendenti
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={saveSettings}
            disabled={saving || !hasChanges || Object.values(errors).some(error => error)}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salva Impostazioni'}
          </Button>
          
          <Button
            variant="outline"
            onClick={resetSettings}
            disabled={saving || !hasChanges}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Annulla Modifiche
          </Button>
          
          <Button
            variant="outline"
            onClick={loadSettings}
            disabled={saving}
            className="sm:w-auto"
          >
            Ricarica
          </Button>
        </div>

        {/* Help text */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Come funziona:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Le modifiche si applicano a tutti i dipendenti del sistema</li>
              <li>I dipendenti esistenti manterranno i loro giorni rimanenti</li>
              <li>Le nuove configurazioni si applicano dal prossimo rinnovo annuale</li>
              <li>I giorni di malattia illimitati (-1) richiedono documentazione medica</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}