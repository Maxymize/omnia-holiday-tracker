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
  AlertTriangle
} from 'lucide-react';

type TabType = 'overview' | 'calendar' | 'requests' | 'stats' | 'profile' | 'settings';

function EmployeeDashboardContent() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get active tab from URL params, default to 'overview'
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
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
    if (tab && ['overview', 'calendar', 'requests', 'stats', 'profile', 'settings'].includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]);

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

  const getUserInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Giorni rimasti</p>
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
                          <p className="text-sm text-gray-600">Giorni utilizzati</p>
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
                          <p className="text-sm text-gray-600">In attesa</p>
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
                          <p className="text-sm text-gray-600">Prossime</p>
                          <p className="text-2xl font-bold text-purple-600">{stats.upcomingHolidays}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Main Overview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Holiday Balance */}
                <div className="lg:col-span-1">
                  <HolidayBalance stats={stats} loading={holidaysLoading} />
                </div>

                {/* Upcoming Holidays */}
                <div className="lg:col-span-2">
                  <UpcomingHolidays 
                    holidays={getUpcomingHolidays()} 
                    loading={holidaysLoading}
                    onCreateRequest={handleCreateRequest}
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
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Calendar */}
                <div className="flex-1">
                  <ResponsiveCalendar
                    showAddButton={true}
                    showTeamHolidays={true}
                    onHolidayCreated={handleHolidayCreated}
                    showLegend={false}
                  />
                </div>

                {/* Desktop Legend Sidebar */}
                <div className="hidden lg:block lg:w-80 space-y-4">
                  <CalendarLegend />
                  <HolidayBalance stats={stats} loading={holidaysLoading} />
                </div>
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

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Statistiche Ferie</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HolidayBalance stats={stats} loading={holidaysLoading} />
                <UpcomingHolidays 
                  holidays={getUpcomingHolidays()} 
                  loading={holidaysLoading}
                  onCreateRequest={handleCreateRequest}
                />
              </div>

              {/* Additional Stats Cards */}
              {stats && (
                <StatsCards stats={[
                  {
                    title: 'Richieste Totali',
                    value: stats.totalRequests.toString(),
                    description: 'Richieste create quest\'anno',
                    icon: Calendar,
                    variant: 'default'
                  },
                  {
                    title: 'Richieste Approvate',
                    value: stats.approvedRequests.toString(),
                    description: 'Approvazioni ricevute',
                    icon: CheckCircle,
                    variant: 'success'
                  },
                  {
                    title: 'In Attesa',
                    value: stats.pendingRequests.toString(),
                    description: 'Richieste da approvare',
                    icon: Clock,
                    variant: 'warning'
                  },
                  {
                    title: 'Rifiutate',
                    value: stats.rejectedRequests.toString(),
                    description: 'Richieste rifiutate',
                    icon: AlertTriangle,
                    variant: 'error'
                  }
                ]} />
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Profilo Dipendente</h2>
              
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Informazioni Personali</span>
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
                      <p className="text-sm text-gray-900 mt-1">
                        {user.status === 'active' ? 'Attivo' : 'In attesa di approvazione'}
                      </p>
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
    </Suspense>
  );
}