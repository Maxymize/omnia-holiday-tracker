'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToasts } from '@/lib/utils/toast';
import { User, Camera, Save, X, Eye, EyeOff, Building2, Mail, Phone, Shield, UserCog, Trash2 } from 'lucide-react';
import { z } from 'zod';

interface Department {
  id: string;
  name: string;
  location?: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate: () => void;
}

// Validation schema
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve avere almeno 2 caratteri').max(100),
  email: z.string().email('Email non valida'),
  phone: z.string().min(10, 'Numero di telefono deve avere almeno 10 cifre').max(20).optional().or(z.literal('')),
  jobTitle: z.string().min(2, 'Mansione deve avere almeno 2 caratteri').max(100, 'Mansione non può superare 100 caratteri').optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password deve avere almeno 8 caratteri').optional().or(z.literal('')),
  confirmPassword: z.string().optional()
}).refine(
  (data) => {
    if (data.newPassword && data.newPassword.length > 0) {
      return data.currentPassword && data.currentPassword.length > 0;
    }
    return true;
  },
  {
    message: "Password attuale richiesta per cambio password",
    path: ["currentPassword"],
  }
).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Le password non corrispondono",
    path: ["confirmPassword"],
  }
);

export function ProfileEditModal({ isOpen, onClose, onProfileUpdate }: ProfileEditModalProps) {
  const { user, refreshUserData } = useAuth();
  const { success, error } = useToasts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    departmentId: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with user data
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        jobTitle: user.jobTitle || '',
        departmentId: user.departmentId || 'none',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setAvatarPreview(user.avatarUrl || '');
      loadDepartments();
    }
  }, [user, isOpen]);

  // Load departments for selection
  const loadDepartments = async () => {
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin;

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/get-departments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle avatar image selection
  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      error("Errore", "Formato file non supportato. Usa: JPEG, PNG, GIF o WebP");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      error("Errore", "File troppo grande. Dimensione massima: 2MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle avatar removal
  const handleAvatarRemove = () => {
    setAvatarPreview('');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload avatar to server
  const uploadAvatar = async (imageData: string, fileName: string, mimeType: string) => {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : window.location.origin;

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${baseUrl}/.netlify/functions/upload-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData,
        fileName,
        mimeType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante il caricamento dell\'avatar');
    }

    return response.json();
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate form data
      const validatedData = profileSchema.parse(formData);

      let avatarUrl = user?.avatarUrl || '';

      // Handle avatar changes
      if (avatarPreview !== user?.avatarUrl) {
        if (avatarPreview === '') {
          // User wants to remove avatar
          avatarUrl = '';
        } else if (avatarPreview) {
          // User wants to upload new avatar
          try {
            const uploadResult = await uploadAvatar(
              avatarPreview,
              `avatar_${user?.id}.jpg`,
              'image/jpeg'
            );
            avatarUrl = uploadResult.data.avatarUrl;
          } catch (avatarError) {
            error("Errore Avatar", avatarError instanceof Error ? avatarError.message : "Errore durante il caricamento dell'avatar");
            // Continue with profile update even if avatar fails
          }
        }
      }

      // Update profile
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin;

      const token = localStorage.getItem('accessToken');
      const updateData: any = {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        jobTitle: validatedData.jobTitle || null,
        departmentId: validatedData.departmentId || null,
        avatarUrl: avatarUrl || null
      };

      // Add password fields if provided
      if (validatedData.newPassword && validatedData.currentPassword) {
        updateData.currentPassword = validatedData.currentPassword;
        updateData.newPassword = validatedData.newPassword;
      }

      const response = await fetch(`${baseUrl}/.netlify/functions/get-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        success("Successo", "Profilo aggiornato con successo");

        // Refresh user data
        await refreshUserData();
        onProfileUpdate();
        onClose();
      } else {
        throw new Error(result.error || 'Errore durante l\'aggiornamento');
      }

    } catch (err) {
      console.error('Profile update error:', err);

      if (err instanceof z.ZodError) {
        // Handle validation errors
        const newErrors: Record<string, string> = {};
        err.errors.forEach((zodErr) => {
          const field = zodErr.path[0] as string;
          newErrors[field] = zodErr.message;
        });
        setErrors(newErrors);
      } else {
        error("Errore", err instanceof Error ? err.message : "Errore durante l'aggiornamento del profilo");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserCog className="h-5 w-5" />
            <span>Modifica Profilo</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview || user.avatarUrl} />
                <AvatarFallback className="text-lg">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 flex space-x-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 w-8 p-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                {(avatarPreview || user.avatarUrl) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleAvatarRemove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground text-center">
              Clicca sulla fotocamera per cambiare avatar<br/>
              {(avatarPreview || user.avatarUrl) && "Clicca sul cestino per rimuovere l'avatar<br/>"}
              (Formati supportati: JPEG, PNG, GIF, WebP - Max 2MB)
            </p>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Nome e Cognome</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Inserisci nome e cognome"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Inserisci email"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Telefono (opzionale)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+39 123 456 7890"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="flex items-center space-x-2">
                <UserCog className="h-4 w-4" />
                <span>Mansione Aziendale</span>
              </Label>
              <Input
                id="jobTitle"
                type="text"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                placeholder="es. Project Manager, CEO, Sviluppatore..."
                className={errors.jobTitle ? 'border-red-500' : ''}
              />
              {errors.jobTitle && <p className="text-sm text-red-500">{errors.jobTitle}</p>}
              <p className="text-xs text-muted-foreground">
                Inserisci la tua mansione o posizione aziendale
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Dipartimento</span>
              </Label>
              <Select 
                value={formData.departmentId} 
                onValueChange={(value) => handleInputChange('departmentId', value === 'none' ? '' : value)}
              >
                <SelectTrigger className={errors.departmentId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleziona dipartimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun dipartimento</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} {dept.location && `(${dept.location})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && <p className="text-sm text-red-500">{errors.departmentId}</p>}
            </div>
          </div>

          {/* Role Display (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Ruolo</span>
            </Label>
            <div className="flex items-center space-x-2 p-3 border rounded-md bg-gray-50">
              <span className="text-sm">
                {user.role === 'admin' ? 'Amministratore' : 'Dipendente'}
              </span>
              {user.email === 'max.giurastante@omniaservices.net' && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Il ruolo può essere modificato solo dagli amministratori
            </p>
          </div>

          {/* Password Change Section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900">Cambio Password (opzionale)</h4>
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Attuale</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Inserisci password attuale"
                  className={errors.currentPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.currentPassword && <p className="text-sm text-red-500">{errors.currentPassword}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder="Nuova password"
                    className={errors.newPassword ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Conferma nuova password"
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}