'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Image as ImageIcon, 
  Type, 
  Upload, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  Eye
} from 'lucide-react';
import Image from 'next/image';

interface LoginLogoSettings {
  login_logo_type: 'image' | 'text';
  login_logo_url: string | null;
  login_brand_text: string;
}

interface LoginLogoCustomizationProps {
  className?: string;
}

export function LoginLogoCustomization({ className = "" }: LoginLogoCustomizationProps) {
  const [loginLogoSettings, setLoginLogoSettings] = useState<LoginLogoSettings>({
    login_logo_type: 'text',
    login_logo_url: null,
    login_brand_text: 'Omnia Holiday Tracker'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current logo settings
  useEffect(() => {
    fetchLoginLogoSettings();
  }, []);

  const fetchLoginLogoSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/.netlify/functions/get-logo-settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Extract only login logo settings
        setLoginLogoSettings({
          login_logo_type: result.data.login_logo_type || 'text',
          login_logo_url: result.data.login_logo_url || null,
          login_brand_text: result.data.login_brand_text || 'Omnia Holiday Tracker'
        });
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (error) {
      console.error('Error fetching login logo settings:', error);
      setError(error instanceof Error ? error.message : 'Errore nel caricamento delle impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoTypeChange = (type: 'image' | 'text') => {
    setLoginLogoSettings(prev => ({
      ...prev,
      login_logo_type: type
    }));
    setError(null);
    setSuccess(null);
  };

  const handleBrandTextChange = (text: string) => {
    setLoginLogoSettings(prev => ({
      ...prev,
      login_brand_text: text
    }));
    setError(null);
    setSuccess(null);
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato file non supportato. Sono accettati solo PNG e JPG.');
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setError('File troppo grande. La dimensione massima è 2MB.');
      return;
    }

    uploadLoginLogo(file);
  };

  const uploadLoginLogo = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('loginLogo', file);

      const response = await fetch('/.netlify/functions/upload-login-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `Errore ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Update logo settings with new URL
        setLoginLogoSettings(prev => ({
          ...prev,
          login_logo_type: 'image',
          login_logo_url: result.data.url
        }));
        setSuccess('Logo di login caricato con successo!');
      } else {
        throw new Error(result.error || 'Errore sconosciuto durante il caricamento');
      }
    } catch (error) {
      console.error('Error uploading login logo:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il caricamento del logo');
    } finally {
      setUploading(false);
    }
  };

  const saveLoginLogoSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (loginLogoSettings.login_logo_type === 'text' && !loginLogoSettings.login_brand_text.trim()) {
      setError('Il testo del brand è richiesto quando si usa la modalità testo.');
      setSaving(false);
      return;
    }

    if (loginLogoSettings.login_logo_type === 'image' && !loginLogoSettings.login_logo_url) {
      setError('È necessario caricare un logo quando si usa la modalità immagine.');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/.netlify/functions/update-login-logo-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginLogoSettings)
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `Errore ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Impostazioni logo di login salvate con successo!');
      } else {
        throw new Error(result.error || 'Errore sconosciuto durante il salvataggio');
      }
    } catch (error) {
      console.error('Error saving login logo settings:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il salvataggio delle impostazioni');
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Personalizzazione Logo Pagina di Login</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <ImageIcon className="h-5 w-5" />
          <span>Personalizzazione Logo Pagina di Login</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Personalizza il logo che apparirà nella pagina di login caricando un'immagine o usando un testo
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error/Success Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Logo Type Selection */}
        <div className="space-y-3">
          <Label>Tipo di Logo</Label>
          <RadioGroup
            value={loginLogoSettings.login_logo_type}
            onValueChange={handleLogoTypeChange}
            className="flex space-x-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="image" id="login-image" className="scale-75" />
              <Label htmlFor="login-image" className="flex items-center space-x-1 cursor-pointer text-sm">
                <ImageIcon className="h-4 w-4" />
                <span>Immagine</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="login-text" className="scale-75" />
              <Label htmlFor="login-text" className="flex items-center space-x-1 cursor-pointer text-sm">
                <Type className="h-4 w-4" />
                <span>Testo</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Image Upload Section */}
        {loginLogoSettings.login_logo_type === 'image' && (
          <div className="space-y-4">
            <Label>Carica Logo (PNG o JPG, max 2MB)</Label>
            
            {/* Current Logo Preview */}
            {loginLogoSettings.login_logo_url && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-sm text-gray-600 mb-2">Logo attuale:</div>
                <Image
                  src={loginLogoSettings.login_logo_url}
                  alt="Current Login Logo"
                  width={200}
                  height={100}
                  className="max-h-20 w-auto object-contain"
                />
              </div>
            )}
            
            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={`h-12 w-12 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className={`text-lg font-medium mb-2 ${dragOver ? 'text-blue-700' : 'text-gray-700'}`}>
                {uploading ? 'Caricamento in corso...' : 'Trascina un file qui o clicca per selezionare'}
              </p>
              <p className="text-sm text-gray-500">
                PNG o JPG, dimensione massima 2MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Text Input Section */}
        {loginLogoSettings.login_logo_type === 'text' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="login-brand-text">Testo del Brand</Label>
              <Input
                id="login-brand-text"
                type="text"
                value={loginLogoSettings.login_brand_text}
                onChange={(e) => handleBrandTextChange(e.target.value)}
                placeholder="Es. Omnia Holiday Tracker"
                maxLength={100}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Massimo 100 caratteri. Apparirà come testo nella pagina di login.
              </p>
            </div>
            
            {/* Text Preview */}
            {loginLogoSettings.login_brand_text && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-sm text-gray-600 mb-2 flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  Anteprima:
                </div>
                <div className="text-xl font-bold text-gray-900 text-center">
                  {loginLogoSettings.login_brand_text}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={saveLoginLogoSettings}
            disabled={saving || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salva Impostazioni Logo Login'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}