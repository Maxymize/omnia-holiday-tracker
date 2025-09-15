'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useProfile } from '@/lib/hooks/useProfile';
import { useAdminData } from '@/lib/hooks/useAdminData';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { ResponsiveCalendar, CalendarLegend } from '@/components/calendar/responsive-calendar';
import { AdminSidebar } from '@/components/dashboard/admin-sidebar';
import { EmployeeManagement } from '@/components/admin/employee-management';
import { HolidayRequestsManagement } from '@/components/admin/holiday-requests-management';
import { SystemSettingsComponent } from '@/components/admin/system-settings';
import { AdminReports } from '@/components/admin/admin-reports';
import { DepartmentManagement } from '@/components/admin/department-management';
import { MyRequestsAdmin } from '@/components/admin/my-requests-admin';
import { RecentActivities } from '@/components/admin/recent-activities';
import { NotificationHeader } from '@/components/ui/notification-header';
import { CustomizableHeader } from '@/components/layout/customizable-header';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ProfileEditModal } from '@/components/profile/profile-edit-modal';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { 
  Calendar, 
  BarChart3, 
  Users, 
  Settings, 
  FileText,
  UserCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
  Building2,
  UserCog
} from 'lucide-react';

type AdminTabType = 'overview' | 'calendar' | 'employees' | 'requests' | 'my-requests' | 'departments' | 'reports' | 'settings';

// Hash to tab mapping for URL routing (supports all languages)
const hashToTab: Record<string, AdminTabType> = {
  // Italian
  '#panoramica': 'overview',
  '#calendario': 'calendar',
  '#dipendenti': 'employees',
  '#richieste': 'requests',
  '#le-mie-richieste': 'my-requests',
  '#dipartimenti': 'departments',
  '#report': 'reports',
  '#impostazioni': 'settings',
  // English
  '#overview': 'overview',
  '#calendar': 'calendar',
  '#employees': 'employees',
  '#requests': 'requests',
  '#my-requests': 'my-requests',
  '#departments': 'departments',
  '#reports': 'reports',
  '#settings': 'settings',
  // Spanish
  '#resumen': 'overview',
  '#empleados': 'employees',
  '#solicitudes': 'requests',
  '#mis-solicitudes': 'my-requests',
  '#departamentos': 'departments',
  '#informes': 'reports',
  '#configuracion': 'settings'
};

// Tab to hash mapping for URL updates (using current locale)
const getTabHash = (tab: AdminTabType, locale: string = 'it'): string => {
  const hashes = {
    it: {
      overview: '#panoramica',
      calendar: '#calendario',
      employees: '#dipendenti',
      requests: '#richieste',
      'my-requests': '#le-mie-richieste',
      departments: '#dipartimenti',
      reports: '#report',
      settings: '#impostazioni'
    },
    en: {
      overview: '#overview',
      calendar: '#calendar',
      employees: '#employees',
      requests: '#requests',
      'my-requests': '#my-requests',
      departments: '#departments',
      reports: '#reports',
      settings: '#settings'
    },
    es: {
      overview: '#resumen',
      calendar: '#calendario',
      employees: '#empleados',
      requests: '#solicitudes',
      'my-requests': '#mis-solicitudes',
      departments: '#departamentos',
      reports: '#informes',
      settings: '#configuracion'
    }
  };

  return hashes[locale as keyof typeof hashes]?.[tab] || hashes.it[tab] || '#panoramica';
};

interface Activity {
  id: string;
  type: 'holiday_request' | 'employee_registration' | 'holiday_approved' | 'holiday_rejected';
  title: string;
  description: string;
  date: string;
  user: {
    name: string;
    email: string;
  };
  status?: string;
}

export default function AdminDashboard() {
  const { user, loading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Hash routing logic
  useEffect(() => {
    // Function to handle hash changes and set active tab
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('🔗 Hash changed:', hash);

      if (hash && hashToTab[hash]) {
        const newTab = hashToTab[hash];
        console.log('📍 Switching to tab:', newTab);
        setActiveTab(newTab);
      } else if (!hash) {
        // No hash, default to overview
        setActiveTab('overview');
      }
    };

    // Set initial tab from URL hash on component mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Update URL hash when tab changes (but prevent recursive calls)
  const updateUrlHash = (tab: AdminTabType) => {
    const currentLocale = window.location.pathname.split('/')[1] || 'it';
    const newHash = getTabHash(tab, currentLocale);

    if (window.location.hash !== newHash) {
      // Use replaceState to avoid adding history entries for tab switches
      window.history.replaceState(null, '', window.location.pathname + newHash);
    }
  };

  // Fetch admin data
  const {
    employees,
    departments,
    pendingRequests,
    systemSettings,
    adminStats,
    loading: adminLoading,
    error: adminError,
    fetchAllAdminData,
    approveEmployee,
    rejectEmployee,
    approveHolidayRequest,
    rejectHolidayRequest,
    deleteHolidayRequest,
    updateSystemSetting,
    clearError
  } = useAdminData();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/it/login');
      } else if (!isAdmin) {
        router.push('/it/employee-dashboard');
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const handleHolidayCreated = () => {
    console.log('Holiday created - refreshing admin data');
    fetchAllAdminData();
  };

  const handleTabChange = (tab: AdminTabType) => {
    console.log('🎯 Tab change requested:', tab);
    setActiveTab(tab);
    updateUrlHash(tab); // Update URL hash when tab changes
    if (adminError) {
      clearError();
    }
  };

  // State for activities
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Fetch activities from API
  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/get-activities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.data.activities || []);
      } else {
        console.error('Failed to fetch activities:', response.statusText);
      }
    } catch (error) {
      // Only log errors that aren't due to language changes or navigation
      if (error instanceof Error && !error.message.includes('Load failed') && !error.message.includes('aborted')) {
        console.error('Error fetching activities:', error);
      }
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Handle activity deletion
  const handleDeleteActivities = async (activityIds: string[]) => {
    try {
      const token = localStorage.getItem('accessToken');
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/delete-activities`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activityIds })
      });

      if (response.ok) {
        // Refresh activities after deletion
        fetchActivities();
      } else {
        throw new Error('Failed to delete activities');
      }
    } catch (error) {
      console.error('Error deleting activities:', error);
      throw error;
    }
  };

  // Load activities when component mounts or admin data changes
  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchActivities();
    }
  }, [isAdmin, adminLoading]);

  if (authLoading || (authLoading && adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Sidebar */}
      <AdminSidebar 
        adminStats={adminStats || undefined}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onEditProfile={() => setIsProfileModalOpen(true)}
      />
      
      {/* Main Content */}
      <div className="lg:pl-80">
        {/* Header con Notifiche Personalizzabile */}
        <CustomizableHeader style={{ minHeight: '112px' }}>
          <div className="flex items-center justify-between w-full">
            <div className="flex-grow">
              <NotificationHeader
                activities={activities}
                loading={activitiesLoading}
                onMarkAsRead={() => {
                  // Le notifiche vengono marcate come lette automaticamente
                  console.log('Notifiche marcate come lette');
                }}
                onDeleteNotification={async (id: string) => {
                  // Elimina singola notifica
                  await handleDeleteActivities([id]);
                }}
              />
            </div>
            <div className="flex items-center space-x-4 ml-4">
              <LanguageSwitcher className="text-sm" />
            </div>
          </div>
        </CustomizableHeader>

        <div className="px-4 py-6 lg:px-8">
          {/* Global Error Alert */}
          {adminError && (
            <div className="mb-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {adminError}
                  <button 
                    onClick={clearError}
                    className="ml-2 underline hover:no-underline"
                  >
                    {t('admin.dashboard.hideError')}
                  </button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Admin Overview Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
                <h2 className="text-xl font-bold">
                  {t('admin.dashboard.title')}
                </h2>
                <p className="mt-1 text-purple-100">
                  {t('admin.dashboard.subtitle')}
                </p>
              </div>

              {/* Admin Statistics - Clickable Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Dipendenti Totali -> Dipendenti */}
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:border-blue-200"
                  onClick={() => handleTabChange('employees')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('admin.dashboard.totalEmployees')}</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.totalEmployees || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {adminStats?.activeEmployees || 0} {t('admin.dashboard.activeEmployees')}
                    </p>
                  </CardContent>
                </Card>

                {/* Richieste Pendenti -> Richieste */}
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 hover:bg-gradient-to-br hover:from-amber-50 hover:to-amber-100 hover:border-amber-200"
                  onClick={() => handleTabChange('requests')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('admin.dashboard.pendingRequests')}</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.pendingHolidayRequests || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.dashboard.requireApproval')}
                    </p>
                  </CardContent>
                </Card>

                {/* Ferie Questo Mese -> Calendario */}
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100 hover:border-green-200"
                  onClick={() => handleTabChange('calendar')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('admin.dashboard.holidaysThisMonth')}</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.holidaysThisMonth || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.dashboard.totalDaysUsed')}
                    </p>
                  </CardContent>
                </Card>

                {/* Nuovi Registrati -> Dipendenti */}
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 hover:border-purple-200"
                  onClick={() => handleTabChange('employees')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('admin.dashboard.newRegistrations')}</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.pendingEmployees || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.dashboard.pendingApproval')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Recent Activities with full functionality */}
              <RecentActivities
                activities={activities}
                loading={activitiesLoading}
                onDeleteActivities={handleDeleteActivities}
                onRefresh={fetchActivities}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              {/* Legend and Statistics - Now horizontal at the top */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CalendarLegend />
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('admin.dashboard.calendarStats')}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex justify-between text-xs">
                        <span>{t('admin.dashboard.totalEmployeesCount')}</span>
                        <span className="font-medium">{adminStats?.totalEmployees || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>{t('admin.dashboard.pendingRequestsCount')}</span>
                        <span className="font-medium">{adminStats?.pendingHolidayRequests || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>{t('admin.dashboard.onHolidayToday')}</span>
                        <span className="font-medium">{adminStats?.employeesOnHolidayToday || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>{t('admin.dashboard.departmentsCount')}</span>
                        <span className="font-medium">{adminStats?.departmentCount || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Calendar - Now full width */}
              <div className="w-full">
                <ResponsiveCalendar
                  showAddButton={false}
                  showTeamHolidays={true}
                  onHolidayCreated={handleHolidayCreated}
                  showLegend={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <EmployeeManagement
              employees={employees}
              departments={departments}
              loading={adminLoading}
              error={adminError}
              onApproveEmployee={approveEmployee}
              onRejectEmployee={rejectEmployee}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'requests' && (
            <HolidayRequestsManagement
              requests={pendingRequests}
              loading={adminLoading}
              error={adminError}
              onApproveRequest={approveHolidayRequest}
              onRejectRequest={rejectHolidayRequest}
              onDeleteRequest={deleteHolidayRequest}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'my-requests' && (
            <MyRequestsAdmin
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentManagement
              departments={departments}
              employees={employees}
              loading={adminLoading}
              error={adminError}
              onRefresh={fetchAllAdminData}
            />
          )}

          {activeTab === 'reports' && (
            <AdminReports
              employees={employees}
              requests={pendingRequests}
              loading={adminLoading}
              error={adminError}
            />
          )}

          {activeTab === 'settings' && (
            <SystemSettingsComponent
              settings={systemSettings}
              loading={adminLoading}
              error={adminError}
              onUpdateSetting={updateSystemSetting}
              onRefresh={fetchAllAdminData}
            />
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdate={fetchAllAdminData}
      />
      
      <Footer />
    </div>
  );
}