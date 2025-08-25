'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useHolidays } from '@/lib/hooks/useHolidays';
import { MultiStepHolidayRequest } from '@/components/forms/multi-step-holiday-request';
import { HolidayBalance } from '@/components/dashboard/holiday-balance';
import { HolidayHistoryTable } from '@/components/dashboard/holiday-history-table';
import { UpcomingHolidays } from '@/components/dashboard/upcoming-holidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  BarChart3, 
  User, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Plus,
  RefreshCw,
  Bell,
  AlertTriangle,
  FileText,
  Download,
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  Shield
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Holiday } from '@/lib/hooks/useHolidays';
import { toast } from '@/lib/utils/toast';

type AdminRequestsTabType = 'dashboard' | 'calendar' | 'requests' | 'profile';

interface MyRequestsAdminProps {
  onRefresh?: () => void;
}

export function MyRequestsAdmin({ onRefresh }: MyRequestsAdminProps) {
  const { user, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminRequestsTabType>('dashboard');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Use employee hooks to get personal data
  const {
    holidays,
    stats,
    loading,
    error,
    refreshHolidays,
    getHolidaysByStatus,
    getUpcomingHolidays
  } = useHolidays({ viewMode: 'own' });

  // Derive data from hooks
  const pendingHolidays = getHolidaysByStatus('pending');
  const upcomingHolidays = getUpcomingHolidays();

  // Refresh data when component mounts - with strict control to prevent loops
  useEffect(() => {
    let mounted = true;
    
    // Only run if component is still mounted
    const loadData = async () => {
      if (!mounted) return;
      
      try {
        await Promise.all([
          refreshHolidays(),
          refreshUserData()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    // Only run once on mount
    loadData();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  const handleHolidayCreated = async () => {
    await refreshHolidays();
    await refreshUserData();
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleTabChange = (tab: AdminRequestsTabType) => {
    setActiveTab(tab);
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const tabItems = [
    {
      id: 'dashboard' as AdminRequestsTabType,
      label: 'Dashboard',
      icon: TrendingUp,
      description: 'Le mie statistiche'
    },
    {
      id: 'calendar' as AdminRequestsTabType,
      label: 'Calendario',
      icon: Calendar,
      description: 'Le mie ferie'
    },
    {
      id: 'requests' as AdminRequestsTabType,
      label: 'Richieste',
      icon: FileText,
      description: 'Le mie richieste',
      badge: pendingHolidays.length > 0 ? pendingHolidays.length : undefined
    },
    {
      id: 'profile' as AdminRequestsTabType,
      label: 'Profilo',
      icon: User,
      description: 'I miei dati'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with admin badge */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold">Le Mie Richieste</h1>
              <Shield className="h-6 w-6" />
            </div>
            <p className="mt-1 text-green-100">
              Dashboard personale per amministratori - Gestisci le tue ferie come dipendente
            </p>
            <div className="mt-3 flex items-center text-sm text-green-100">
              <span>Account: {user?.name}</span>
              <span className="mx-2">•</span>
              <span>Ruolo: Amministratore</span>
              <span className="mx-2">•</span>
              <span>Email: {user?.email}</span>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-white text-green-600 hover:bg-green-50"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuova Richiesta
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button 
              onClick={refreshHolidays}
              className="ml-2 underline hover:no-underline"
            >
              Riprova
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Giorni Disponibili</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.availableDays || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Su {stats?.totalAllowance || 0} totali
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Giorni Utilizzati</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.usedDays || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Goduti quest&apos;anno
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Richieste Pendenti</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingHolidays.length}</div>
                <p className="text-xs text-muted-foreground">
                  In attesa di approvazione
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prossime Ferie</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingHolidays.length}</div>
                <p className="text-xs text-muted-foreground">
                  Ferie programmate
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Holiday Balance */}
            <HolidayBalance
              stats={stats}
              user={user}
            />
            
            {/* Upcoming Holidays */}
            <UpcomingHolidays
              holidays={upcomingHolidays}
              onHolidayClick={(holiday) => {
                // Show holiday details in a toast or alert
                toast.info(`📋 Dettaglio Ferie: ${holiday.employeeName || 'Tu'}`, 
                  `📅 Dal ${holiday.startDate} al ${holiday.endDate}\n📝 Tipo: ${
                    holiday.type === 'vacation' ? 'Ferie' : 
                    holiday.type === 'sick' ? 'Malattia' : 'Permesso Personale'
                  }\n⏰ Durata: ${holiday.workingDays} giorni lavorativi${
                    holiday.notes ? `\n💬 Note: ${holiday.notes}` : ''
                  }`
                );
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <ResponsiveCalendar
            showAddButton={true}
            showTeamHolidays={false}
            onHolidayCreated={handleHolidayCreated}
            showLegend={true}
          />
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Action Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Le Mie Richieste di Ferie</h2>
              <p className="text-gray-600">Gestisci le tue richieste di ferie personali</p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={refreshHolidays}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>
              <Button
                onClick={() => setShowCreateDialog(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Richiesta
              </Button>
            </div>
          </div>

          {/* Holiday History */}
          <HolidayHistoryTable
            holidays={holidays}
            loading={loading}
            onRefresh={refreshHolidays}
          />
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profilo Amministratore</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome</label>
                  <p className="text-gray-900">{user?.name || 'Non specificato'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ruolo</label>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-100 text-purple-800">Amministratore</Badge>
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Giorni di ferie annuali</label>
                  <p className="text-gray-900">{stats?.totalAllowance || 0} giorni</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Dipartimento</label>
                  <p className="text-gray-900">{user?.departmentName || 'Nessuno'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Stato account</label>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Attivo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Holiday Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Nuova Richiesta di Ferie</DialogTitle>
          </DialogHeader>
          <MultiStepHolidayRequest
            onSubmit={async (data) => {
              // Show success message without auto-redirect
              console.log('Holiday request completed successfully:', data);
              
              // Refresh data
              await handleHolidayCreated();
              
              // Show success message
              toast.success('✅ Richiesta ferie inviata con successo!', 
                'La tua richiesta è stata inviata per approvazione.'
              );
              
              // Close dialog only - no redirect
              setShowCreateDialog(false);
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}