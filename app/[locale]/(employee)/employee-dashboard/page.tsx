'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
import { useHolidays } from '@/lib/hooks/useHolidays';
import { useProfile } from '@/lib/hooks/useProfile';
import { ResponsiveCalendar, CalendarLegend } from '@/components/calendar/responsive-calendar';
import { HolidayBalance } from '@/components/dashboard/holiday-balance';
import { HolidayHistoryTable } from '@/components/dashboard/holiday-history-table';
import { UpcomingHolidays } from '@/components/dashboard/upcoming-holidays';
import { CompletedHolidays } from '@/components/dashboard/completed-holidays';
import { EmployeeSidebar } from '@/components/dashboard/employee-sidebar';
import { CustomizableHeader } from '@/components/layout/customizable-header';
import { ProfileEditModal } from '@/components/profile/profile-edit-modal';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Building2,
  Phone,
  UserCog,
  CalendarDays,
  CalendarCheck,
  CalendarClock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PWAInstallBanner } from '@/components/ui/pwa-install-banner';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { Holiday } from '@/lib/hooks/useHolidays';
import { format } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';

type TabType = 'overview' | 'calendar' | 'requests' | 'profile';

function EmployeeDashboardContent() {
  const { t, locale } = useTranslation();
  const { user, refreshUserData } = useAuth();
  const { profile, refreshProfile } = useProfile(); // Fresh profile data from server
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get active tab from URL params, default to 'overview'
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Holiday details modal state
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Fetch holiday data - let the calendar handle visibility filtering
  const { 
    holidays, 
    stats, 
    loading: holidaysLoading, 
    error: holidaysError,
    refreshHolidays,
    getUpcomingHolidays,
    getRecentHolidays 
  } = useHolidays();

  // Handle tab changes from URL params
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['overview', 'calendar', 'requests', 'profile'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]);

  // Auto-refresh user data when page becomes visible (for vacation days updates) - debounced
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = async () => {
      if (!document.hidden && user) {
        // Clear any pending refresh
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        // Debounce the refresh to prevent rapid calls
        refreshTimeout = setTimeout(async () => {
          await refreshUserData();
          refreshHolidays();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Remove the focus handler that was causing excessive refreshes
    // Only keep visibility change for when user switches back to the tab

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
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

  // Prepare sidebar stats (use new detailed metrics)
  const sidebarStats = stats && user ? {
    pendingRequests: stats.pendingRequests,
    upcomingHolidays: stats.upcomingHolidays,
    remainingDays: stats.availableDays // Available days for new requests
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
      <EmployeeSidebar 
        holidayStats={sidebarStats} 
        onEditProfile={() => setIsProfileModalOpen(true)} 
      />
      
      {/* Main Content */}
      <div className="lg:pl-80">
        {/* Header con Logo Personalizzabile */}
        <CustomizableHeader style={{ minHeight: '92px' }}>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher className="text-sm" />
            <PWAInstallBanner />
          </div>
        </CustomizableHeader>

        <div className="px-4 py-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold truncate">
                    {t('dashboard.welcome.title', { name: user.name || t('dashboard.profile.role.employee') })}
                  </h1>
                  <div className="mt-2 space-y-1">
                    <p className="text-blue-100 text-sm sm:text-base">
                      {t('dashboard.welcome.subtitle')}
                    </p>
                    {(profile?.departmentName || user.departmentName) && (
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-blue-200 flex-shrink-0" />
                        <span className="text-sm text-blue-200 truncate">
                          Dipartimento: <span className="font-medium text-white">{profile?.departmentName || user.departmentName}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex items-center space-x-4">
                  <Avatar className="h-12 w-12 border-2 border-white">
                    <AvatarFallback className="text-lg font-medium bg-white text-blue-700">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {user && stats && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {stats.availableDays}
                      </div>
                      <div className="text-sm text-blue-200">giorni disponibili</div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      // Header refresh triggered - refresh all data including profile
                      await refreshUserData();
                      await refreshProfile(); // ⭐ Added profile refresh
                      refreshHolidays();
                      // Refresh completed
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
              {/* Detailed Leave Type Breakdown - Moved from Holiday Balance */}
              {stats && (
                <HolidayBalance stats={stats} user={user} loading={holidaysLoading} />
              )}

              {/* Enhanced Holiday Stats Cards - Now Below Leave Type Cards */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Enhanced Available Days with Breakdown */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Giorni disponibili</p>
                          <p className="text-2xl font-bold text-green-600">{stats.availableDays}</p>
                          {stats.leaveTypes && (
                            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                              <div>🏖️ {stats.leaveTypes.vacation.availableDays} ferie</div>
                              <div>👤 {stats.leaveTypes.personal.availableDays} permessi</div>
                              <div>🏥 {stats.leaveTypes.sick.allowance === -1 ? '∞' : stats.leaveTypes.sick.availableDays} malattia</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Days Already Taken */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CalendarCheck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Giorni già goduti</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.takenDays}</p>
                          <p className="text-xs text-gray-500">ferie passate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Days Booked Future */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <CalendarDays className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Giorni prenotati</p>
                          <p className="text-2xl font-bold text-amber-600">{stats.bookedDays}</p>
                          <p className="text-xs text-gray-500">ferie future</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Pending Days */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <CalendarClock className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Giorni in attesa</p>
                          <p className="text-2xl font-bold text-purple-600">{stats.pendingDays}</p>
                          <p className="text-xs text-gray-500">da approvare</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Main Overview - Upcoming and Completed Holidays */}
              {holidaysLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Loading skeletons for both modules */}
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
                    <div className="border rounded-lg p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
                    <div className="border rounded-lg p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <UpcomingHolidays 
                    holidays={getUpcomingHolidays()} 
                    loading={false}
                    onCreateRequest={handleCreateRequest}
                    onHolidayClick={handleHolidayClick}
                  />
                  <CompletedHolidays 
                    holidays={getRecentHolidays()} 
                    loading={false}
                    onHolidayClick={handleHolidayClick}
                  />
                </div>
              )}

            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              {/* Calendar Legend */}
              <div>
                <CalendarLegend />
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
                <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.navigation.requests')}</h2>
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
              <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.profile.title')}</h2>
              
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Informazioni Personali</span>
                    </div>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => setIsProfileModalOpen(true)}
                      className="text-xs"
                    >
                      <UserCog className="h-4 w-4 mr-1" />
                      {t('dashboard.profile.editButton')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={user.avatarUrl || ''} 
                        alt={user.name || 'User'} 
                      />
                      <AvatarFallback className="text-xl font-medium bg-blue-100 text-blue-700">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status === 'active' ? t('dashboard.profile.status.active') : t('dashboard.profile.status.pending')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ruolo</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {user.role === 'admin' ? t('dashboard.profile.role.admin') : t('dashboard.profile.role.employee')}
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
                          {profile?.departmentName || user.departmentName || t('dashboard.profile.fields.department')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Telefono</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-900">
                          {user.phone || t('dashboard.profile.fields.phone')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Mansione Aziendale</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <UserCog className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-900">
                          {user.jobTitle || t('dashboard.profile.fields.jobTitle')}
                        </span>
                      </div>
                    </div>
                    {stats && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Giorni Ferie Annuali</label>
                          <p className="text-sm text-gray-900 mt-1">{user.holidayAllowance || 25} giorni</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Giorni Rimanenti</label>
                          <p className="text-sm text-gray-900 mt-1">{(user.holidayAllowance || 25) - stats.usedDays} giorni</p>
                        </div>
                      </>
                    )}
                  </div>
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
                    {selectedHoliday.status === 'approved' ? t('dashboard.holidays.statusDetails.approved') : 
                     selectedHoliday.status === 'pending' ? t('dashboard.holidays.statusDetails.pending') : 
                     selectedHoliday.status === 'rejected' ? t('dashboard.holidays.statusDetails.rejected') : selectedHoliday.status}
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
                      {selectedHoliday.status === 'approved' ? t('dashboard.holidays.statusDetails.approved') : 
                       selectedHoliday.status === 'pending' ? t('dashboard.holidays.statusDetails.pendingShort') : 
                       selectedHoliday.status === 'rejected' ? t('dashboard.holidays.statusDetails.rejected') : selectedHoliday.status}
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
                                  alert(t('dashboard.holidays.downloadError'));
                                }
                              } catch (error) {
                                console.error('Download error:', error);
                                alert(t('dashboard.holidays.downloadError'));
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

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdate={async () => {
          await refreshUserData();
          await refreshProfile(); // ⭐ Auto-refresh profile after modal save
          refreshHolidays();
        }}
      />
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