'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAdminData } from '@/lib/hooks/useAdminData';
import { useRouter } from 'next/navigation';
import { ResponsiveCalendar, CalendarLegend } from '@/components/calendar/responsive-calendar';
import { AdminSidebar } from '@/components/dashboard/admin-sidebar';
import { EmployeeManagement } from '@/components/admin/employee-management';
import { HolidayRequestsManagement } from '@/components/admin/holiday-requests-management';
import { SystemSettingsComponent } from '@/components/admin/system-settings';
import { AdminReports } from '@/components/admin/admin-reports';
import { DepartmentManagement } from '@/components/admin/department-management';
import { MyRequestsAdmin } from '@/components/admin/my-requests-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Building2
} from 'lucide-react';

type AdminTabType = 'overview' | 'calendar' | 'employees' | 'requests' | 'my-requests' | 'departments' | 'reports' | 'settings';

export default function AdminDashboard() {
  const { user, loading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTabType>('overview');

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
    setActiveTab(tab);
    if (adminError) {
      clearError();
    }
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <AdminSidebar 
        adminStats={adminStats || undefined}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      {/* Main Content */}
      <div className="lg:pl-80">
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
                    Nascondi
                  </button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Admin Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
                <h1 className="text-2xl font-bold">
                  Pannello Amministratore - Omnia Holiday Tracker
                </h1>
                <p className="mt-1 text-purple-100">
                  Gestisci dipendenti, richieste di ferie e impostazioni del sistema
                </p>
                <div className="mt-3 flex items-center text-sm text-purple-100">
                  <span>Benvenuto, {user?.name}</span>
                  <span className="mx-2">•</span>
                  <span>Ruolo: Amministratore</span>
                </div>
              </div>

              {/* Admin Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Dipendenti Totali</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.totalEmployees || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {adminStats?.activeEmployees || 0} attivi
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Richieste Pendenti</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.pendingHolidayRequests || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Richiedono approvazione
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ferie Questo Mese</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.holidaysThisMonth || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Giorni totali utilizzati
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Nuovi Registrati</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats?.pendingEmployees || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      In attesa approvazione
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Attività Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Nuova richiesta di ferie</p>
                          <p className="text-xs text-gray-600">
                            {request.employeeName} ha richiesto {request.workingDays} giorni 
                            dal {new Date(request.startDate).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    ))}
                    
                    {employees.filter(emp => emp.status === 'pending').slice(0, 2).map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Nuovo dipendente da approvare</p>
                          <p className="text-xs text-gray-600">{employee.name} ({employee.email})</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(employee.createdAt).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    ))}

                    {(pendingRequests.length === 0 && employees.filter(emp => emp.status === 'pending').length === 0) && (
                      <p className="text-center text-gray-500 py-4">Nessuna attività recente</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-6">
              {/* Legend and Statistics - Now horizontal at the top */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CalendarLegend />
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Statistiche Calendario</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Dipendenti totali</span>
                        <span className="font-medium">{adminStats?.totalEmployees || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Richieste pendenti</span>
                        <span className="font-medium">{adminStats?.pendingHolidayRequests || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>In ferie oggi</span>
                        <span className="font-medium">{adminStats?.employeesOnHolidayToday || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Dipartimenti</span>
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
    </div>
  );
}