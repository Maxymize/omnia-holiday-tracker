'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
import { useHolidays } from '@/lib/hooks/useHolidays';
import { ResponsiveCalendar, CalendarLegend } from '@/components/calendar/responsive-calendar';
import { HolidayBalance } from '@/components/dashboard/holiday-balance';
import { HolidayHistoryTable } from '@/components/dashboard/holiday-history-table';
import { UpcomingHolidays } from '@/components/dashboard/upcoming-holidays';
import { EmployeeSidebar } from '@/components/dashboard/employee-sidebar';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  BarChart3, 
  User, 
  Settings, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Plus,
  RefreshCw,
  Bell,
  AlertTriangle,
  FileText,
  Download,
  Building2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PWAInstallBanner } from '@/components/ui/pwa-install-banner';
import { Holiday } from '@/lib/hooks/useHolidays';
import { format } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';

type TabType = 'overview' | 'calendar' | 'requests' | 'profile' | 'settings';

function EmployeeDashboardContent() {
  const { t, locale } = useTranslation();
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get active tab from URL params, default to 'overview'
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Holiday details modal state
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  
  // Fetch holiday data
  const { 
    holidays, 
    stats, 
    loading: holidaysLoading, 
    error: holidaysError,
    refreshHolidays,
    getUpcomingHolidays,
    getRecentHolidays 
  } = useHolidays({ viewMode: 'own' });

  // Handle tab changes from URL params
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['overview', 'calendar', 'requests', 'profile', 'settings'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]);

  // Auto-refresh user data when page becomes visible (for vacation days updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('🔄 Page visible - refreshing user data...');
        refreshUserData();
        refreshHolidays(); // Also refresh holiday data
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh on page focus (when switching tabs/windows)
    const handleFocus = () => {
      if (user) {
        console.log('🔄 Page focused - refreshing user data...');
        refreshUserData();
        refreshHolidays();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, refreshUserData, refreshHolidays]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    router.push(url.pathname + url.search, { scroll: false });
  };

  const handleHolidayCreated = () => {
    // Refresh holiday data when a new holiday is created
    refreshHolidays();
  };

  const handleCreateRequest = () => {
    router.push(`/${locale}/holiday-request`);
  };

  const handleHolidayClick = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
  };

  const getUserInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get date-fns locale
  const getDateLocale = () => {
    switch (locale) {
      case 'it': return it;
      case 'es': return es;
      default: return enUS;
    }
  };

  const getTypeIcon = (type: Holiday['type']) => {
    switch (type) {
      case 'vacation': return '🏖️';
      case 'sick': return '🏥';
      case 'personal': return '👤';
      default: return '📅';
    }
  };

  const getTypeLabel = (type: Holiday['type']) => {
    return t(`holidays.request.types.${type}`);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateLocale = getDateLocale();
    
    if (start.toDateString() === end.toDateString()) {
      return format(start, 'dd MMM yyyy', { locale: dateLocale });
    }
    
    return `${format(start, 'dd MMM', { locale: dateLocale })} - ${format(end, 'dd MMM yyyy', { locale: dateLocale })}`;
  };

  const formatWorkingDays = (days: number) => {
    if (days === 1) {
      return locale === 'it' ? '1 giorno' : locale === 'es' ? '1 día' : '1 day';
    }
    const dayLabel = locale === 'it' ? 'giorni' : locale === 'es' ? 'días' : 'days';
    return `${days} ${dayLabel}`;
  };

  // Prepare sidebar stats
  const sidebarStats = stats ? {
    pendingRequests: stats.pendingRequests,
    upcomingHolidays: stats.upcomingHolidays,
    remainingDays: stats.remainingDays
  } : undefined;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <EmployeeSidebar holidayStats={sidebarStats} />
      
      {/* Main Content */}
      <div className="lg:pl-80">
        <div className="px-4 py-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {t('dashboard.welcome.title', { name: user.name || 'Dipendente' })}
                  </h1>
                  <p className="mt-1 text-blue-100">
                    {t('dashboard.welcome.subtitle')}
                  </p>
                </div>
                <div className="hidden md:flex items-center space-x-4">
                  <Avatar className="h-12 w-12 border-2 border-white">
                    <AvatarFallback className="text-lg font-medium bg-white text-blue-700">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {stats && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">{stats.remainingDays}</div>
                      <div className="text-sm text-blue-200">giorni rimasti</div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      console.log('🔄 Header refresh triggered');
                      refreshUserData();
                      refreshHolidays();
                    }}
                    className="text-blue-700 border-white hover:bg-white/20"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Aggiorna
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Error State */}
          {holidaysError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Errore nel caricamento dei dati
                  </h3>
                  <p className="text-sm text-red-700">{holidaysError}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshHolidays}
                  className="ml-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Riprova
                </Button>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{t('dashboard.stats.availableDays')}</p>
                          <p className="text-2xl font-bold text-green-600">{stats.remainingDays}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{t('dashboard.stats.usedDays')}</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.usedDays}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{t('dashboard.stats.pendingRequests')}</p>
                          <p className="text-2xl font-bold text-amber-600">{stats.pendingRequests}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{t('dashboard.stats.upcomingHolidays')}</p>
                          <p className="text-2xl font-bold text-purple-600">{stats.upcomingHolidays}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Main Overview Grid - Holiday Balance and Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Holiday Balance & Usage */}
                <div>
                  <HolidayBalance stats={stats} loading={holidaysLoading} />
                </div>

                {/* Upcoming Holidays */}
                <div>
                  <UpcomingHolidays 
                    holidays={getUpcomingHolidays()} 
                    loading={holidaysLoading}
                    onCreateRequest={handleCreateRequest}
                    onHolidayClick={handleHolidayClick}
                  />
                </div>
              </div>

              {/* Recent Requests */}
              <div>
                <HolidayHistoryTable 
                  holidays={getRecentHolidays(5)}
                  loading={holidaysLoading}
                  onRefresh={refreshHolidays}
                  compact={true}
                />
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              {/* Legend and Balance Above Calendar - Compact Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Calendar Legend */}
                <div>
                  <CalendarLegend />
                </div>
                
                {/* Holiday Balance */}
                <div>
                  <HolidayBalance stats={stats} loading={holidaysLoading} />
                </div>
              </div>

              {/* Main Calendar - Full Width */}
              <div>
                <ResponsiveCalendar
                  showAddButton={true}
                  showTeamHolidays={true}
                  onHolidayCreated={handleHolidayCreated}
                  showLegend={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Le Mie Richieste</h2>
                <Button onClick={handleCreateRequest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Richiesta
                </Button>
              </div>
              
              <HolidayHistoryTable 
                holidays={holidays}
                loading={holidaysLoading}
                onRefresh={refreshHolidays}
                showActions={true}
              />
            </div>
          )}


          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Profilo Dipendente</h2>
              
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Informazioni Personali</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        console.log('🔄 Manual refresh triggered');
                        refreshUserData();
                        refreshHolidays();
                      }}
                      className="text-xs"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Aggiorna
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-xl font-medium bg-blue-100 text-blue-700">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? 'Attivo' : 'In attesa'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ruolo</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {user.role === 'admin' ? 'Amministratore' : 'Dipendente'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Stato Account</label>
                      <div className="flex items-center space-x-2 mt-1">
                        {user.status === 'active' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">Attivo</span>
                          </>
                        ) : user.status === 'pending' ? (
                          <>
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm text-amber-700 font-medium">In attesa di approvazione</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-700 font-medium">Inattivo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Dipartimento</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-900">
                          {user.departmentName || 'Non assegnato'}
                        </span>
                      </div>
                    </div>
                    {stats && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Giorni Ferie Annuali</label>
                          <p className="text-sm text-gray-900 mt-1">{stats.totalAllowance} giorni</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Giorni Rimanenti</label>
                          <p className="text-sm text-gray-900 mt-1">{stats.remainingDays} giorni</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Impostazioni</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Preferenze Account</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Le impostazioni del profilo e le preferenze utente saranno disponibili qui.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Holiday Details Modal */}
      <Dialog open={!!selectedHoliday} onOpenChange={(open) => !open && setSelectedHoliday(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettagli Ferie</DialogTitle>
          </DialogHeader>
          {selectedHoliday && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-lg">
                  {getTypeIcon(selectedHoliday.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{getTypeLabel(selectedHoliday.type)}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedHoliday.status === 'approved' ? 'Approvata' : 
                     selectedHoliday.status === 'pending' ? 'In attesa di approvazione' : 
                     selectedHoliday.status === 'rejected' ? 'Rifiutata' : selectedHoliday.status}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Periodo</label>
                  <p className="mt-1 text-gray-900">
                    {formatDateRange(selectedHoliday.startDate, selectedHoliday.endDate)}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Giorni lavorativi</label>
                  <p className="mt-1 text-gray-900">{formatWorkingDays(selectedHoliday.workingDays)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Tipo</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={
                      selectedHoliday.type === 'vacation' ? 'bg-blue-100 text-blue-800' :
                      selectedHoliday.type === 'sick' ? 'bg-red-100 text-red-800' :
                      'bg-purple-100 text-purple-800'
                    }>
                      {getTypeIcon(selectedHoliday.type)} {getTypeLabel(selectedHoliday.type)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Stato</label>
                  <div className="mt-1">
                    <Badge className={
                      selectedHoliday.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedHoliday.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {selectedHoliday.status === 'approved' ? 'Approvata' : 
                       selectedHoliday.status === 'pending' ? 'In attesa' : 
                       selectedHoliday.status === 'rejected' ? 'Rifiutata' : selectedHoliday.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedHoliday.notes && (
                <div>
                  <label className="font-medium text-gray-700">Note</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                    {selectedHoliday.notes}
                  </div>
                </div>
              )}

              {/* Medical Certificate Section for Sick Leave */}
              {selectedHoliday.type === 'sick' && (
                <div className="border-t pt-4">
                  <label className="font-medium text-gray-700">Certificato Medico</label>
                  <div className="mt-2">
                    {selectedHoliday.medicalCertificateOption === 'upload' && selectedHoliday.medicalCertificateFileName ? (
                      <div className="flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg gap-3">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <FileText className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-green-800">
                              Certificato caricato
                            </p>
                            <p className="text-sm text-green-700 break-all font-mono bg-green-100 px-2 py-1 rounded mt-1">
                              {selectedHoliday.medicalCertificateFileName}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300"
                          onClick={async () => {
                            if (selectedHoliday.medicalCertificateFileId) {
                              try {
                                const token = localStorage.getItem('accessToken');
                                const baseUrl = process.env.NODE_ENV === 'development' 
                                  ? 'http://localhost:3000' 
                                  : window.location.origin;
                                
                                const response = await fetch(
                                  `${baseUrl}/.netlify/functions/download-medical-certificate?fileId=${selectedHoliday.medicalCertificateFileId}`,
                                  {
                                    headers: {
                                      'Authorization': `Bearer ${token}`
                                    }
                                  }
                                );

                                if (response.ok) {
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = selectedHoliday.medicalCertificateFileName || 'certificato-medico';
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  
                                  window.URL.revokeObjectURL(url);
                                } else {
                                  alert('Errore durante il download del certificato');
                                }
                              } catch (error) {
                                console.error('Download error:', error);
                                alert('Errore durante il download del certificato');
                              }
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Scarica
                        </Button>
                      </div>
                    ) : selectedHoliday.medicalCertificateOption === 'send_later' ? (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              Invio previsto via email
                            </p>
                            <p className="text-xs text-blue-600">
                              Certificato da inviare entro 3 giorni lavorativi
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              Certificato non specificato
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento dashboard...</p>
          </div>
        </div>
      }
    >
      <EmployeeDashboardContent />
      <PWAInstallBanner />
    </Suspense>
  );
}