'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTranslation } from '@/lib/i18n/provider';
import { useHolidays } from '@/lib/hooks/useHolidays';
import { MultiStepHolidayRequest } from '@/components/forms/multi-step-holiday-request';
import { HolidayBalance } from '@/components/dashboard/holiday-balance';
import { HolidayHistoryTable } from '@/components/dashboard/holiday-history-table';
import { UpcomingHolidays } from '@/components/dashboard/upcoming-holidays';
import { CompletedHolidays } from '@/components/dashboard/completed-holidays';
import { ResponsiveCalendar } from '@/components/calendar/responsive-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Plus,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  CalendarDays,
  CalendarCheck,
  CalendarClock,
  Shield,
  Building2
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminRequestsTabType>('dashboard');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  
  // Use employee hooks to get personal data
  const {
    holidays,
    stats,
    loading,
    error,
    refreshHolidays,
    getHolidaysByStatus,
    getUpcomingHolidays,
    getRecentHolidays,
    getCompletedHolidays
  } = useHolidays({ viewMode: 'own' });

  // Derive data from hooks
  const pendingHolidays = getHolidaysByStatus('pending');

  // Note: Data loading is handled by useHolidays hook automatically
  // No need for additional useEffect that causes double loading and delays

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

  const getTypeIcon = (type: Holiday['type']) => {
    switch (type) {
      case 'vacation': return '🏖️';
      case 'sick': return '🏥';
      case 'personal': return '👤';
      default: return '📅';
    }
  };

  const getTypeLabel = (type: Holiday['type']) => {
    switch (type) {
      case 'vacation': return t('admin.myRequests.types.vacation');
      case 'sick': return t('admin.myRequests.types.sick');
      case 'personal': return t('admin.myRequests.types.personal');
      default: return t('admin.myRequests.types.vacation');
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('it-IT');
    }
    
    return `${start.toLocaleDateString('it-IT')} - ${end.toLocaleDateString('it-IT')}`;
  };

  const formatWorkingDays = (days: number) => {
    if (days === 1) {
      return t('admin.myRequests.duration.oneDay');
    }
    return `${days} ${t('admin.myRequests.duration.days')}`;
  };

  const tabItems = [
    {
      id: 'dashboard' as AdminRequestsTabType,
      label: t('admin.myRequests.tabs.dashboard'),
      icon: TrendingUp,
      description: t('admin.myRequests.tabs.dashboardDesc')
    },
    {
      id: 'calendar' as AdminRequestsTabType,
      label: t('admin.myRequests.tabs.calendar'),
      icon: Calendar,
      description: t('admin.myRequests.tabs.calendarDesc')
    },
    {
      id: 'requests' as AdminRequestsTabType,
      label: t('admin.myRequests.tabs.requests'),
      icon: FileText,
      description: t('admin.myRequests.tabs.requestsDesc'),
      badge: pendingHolidays.length > 0 ? pendingHolidays.length : undefined
    },
    {
      id: 'profile' as AdminRequestsTabType,
      label: t('admin.myRequests.tabs.profile'),
      icon: User,
      description: t('admin.myRequests.tabs.profileDesc')
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
      {/* Header with admin badge - Mobile Responsive */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold">{t('admin.myRequests.title')}</h1>
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            </div>
            <p className="mt-1 text-green-100 text-sm sm:text-base">
{t('admin.myRequests.subtitle')}
            </p>
            <div className="mt-3 space-y-1 text-xs sm:text-sm text-green-100">
              <div className="truncate">{t('admin.myRequests.account')} {user?.name}</div>
              <div className="flex items-center space-x-2">
                <span>{t('admin.myRequests.role')}</span>
                <span>•</span>
                <span className="truncate">{user?.email}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-white text-green-600 hover:bg-green-50 flex-shrink-0"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('admin.myRequests.newRequest')}</span>
            <span className="sm:hidden">{t('admin.myRequests.newRequestShort')}</span>
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
{t('admin.myRequests.retry')}
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation - Mobile Responsive */}
      <div className="border-b border-gray-200">
        <nav className="p-1">
          {/* Mobile: Scrollable horizontal tabs */}
          <div className="md:hidden">
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-1">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0",
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-blue-700" : "text-gray-500"
                    )} />
                    <span className="font-medium">{tab.label}</span>
                    {tab.badge && tab.badge > 0 && (
                      <Badge variant="secondary" className="text-xs ml-1">
                        {tab.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: Full layout with descriptions */}
          <div className="hidden md:flex space-x-1">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors group flex-1 min-w-0",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-blue-700" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium truncate">{tab.label}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {tab.description}
                    </div>
                  </div>
                  {tab.badge && tab.badge > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Detailed Leave Type Breakdown - Moved from Holiday Balance */}
          {stats && (
            <HolidayBalance stats={stats} user={user} loading={loading} />
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
                      <p className="text-sm text-gray-600">{t('admin.myRequests.stats.availableDays')}</p>
                      <p className="text-2xl font-bold text-green-600">{stats.availableDays}</p>
                      <p className="text-xs text-gray-500">{t('admin.myRequests.stats.toRequest')}</p>
                      {stats.leaveTypes && (
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <div>🏖️ {stats.leaveTypes.vacation.availableDays} {t('admin.myRequests.stats.vacation')}</div>
                          <div>👤 {stats.leaveTypes.personal.availableDays} {t('admin.myRequests.stats.personal')}</div>
                          <div>🏥 {stats.leaveTypes.sick.allowance === -1 ? '∞' : stats.leaveTypes.sick.availableDays} {t('admin.myRequests.stats.sick')}</div>
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
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{t('admin.myRequests.stats.takenDays')}</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.takenDays || 0}</p>
                      <p className="text-xs text-gray-500">{t('admin.myRequests.stats.pastHolidays')}</p>
                      {/* Breakdown by leave type */}
                      {stats.leaveTypes && (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center space-x-1 text-xs">
                            <span>🏖️</span>
                            <span className="font-semibold">{stats.leaveTypes.vacation.takenDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.vacation')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <span>👤</span>
                            <span className="font-semibold">{stats.leaveTypes.personal.takenDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.personal')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <span>🏥</span>
                            <span className="font-semibold">{stats.leaveTypes.sick.takenDays === -1 ? '∞' : stats.leaveTypes.sick.takenDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.sick')}</span>
                          </div>
                        </div>
                      )}
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
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{t('admin.myRequests.stats.bookedDays')}</p>
                      <p className="text-2xl font-bold text-amber-600">{stats.bookedDays || 0}</p>
                      <p className="text-xs text-gray-500">{t('admin.myRequests.stats.futureHolidays')}</p>
                      {/* Breakdown by leave type */}
                      {stats.leaveTypes && (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center space-x-1 text-xs">
                            <span>🏖️</span>
                            <span className="font-semibold">{stats.leaveTypes.vacation.bookedDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.vacation')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <span>👤</span>
                            <span className="font-semibold">{stats.leaveTypes.personal.bookedDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.personal')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <span>🏥</span>
                            <span className="font-semibold">{stats.leaveTypes.sick.bookedDays === -1 ? '∞' : stats.leaveTypes.sick.bookedDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.sick')}</span>
                          </div>
                        </div>
                      )}
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
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{t('admin.myRequests.stats.pendingDays')}</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.pendingDays || 0}</p>
                      <p className="text-xs text-gray-500">{t('admin.myRequests.stats.awaitingApproval')}</p>
                      {/* Breakdown by leave type */}
                      {stats.leaveTypes && (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center space-x-1 text-xs">
                            <span>🏖️</span>
                            <span className="font-semibold">{stats.leaveTypes.vacation.pendingDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.vacation')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <span>👤</span>
                            <span className="font-semibold">{stats.leaveTypes.personal.pendingDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.personal')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <span>🏥</span>
                            <span className="font-semibold">{stats.leaveTypes.sick.pendingDays === -1 ? '∞' : stats.leaveTypes.sick.pendingDays}</span>
                            <span className="text-gray-500">{t('admin.myRequests.stats.sick')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Overview - Upcoming and Completed Holidays */}
          {loading ? (
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
                onCreateRequest={() => setShowCreateDialog(true)}
                onHolidayClick={(holiday) => {
                  setSelectedHoliday(holiday);
                }}
              />
              <CompletedHolidays
                holidays={getCompletedHolidays()}
                loading={false}
                onHolidayClick={(holiday) => {
                  setSelectedHoliday(holiday);
                }}
              />
            </div>
          )}
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
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{t('admin.myRequests.tabs.requests')}</h2>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.myRequests.newRequest')}
            </Button>
          </div>
          
          <HolidayHistoryTable 
            holidays={holidays}
            loading={loading}
            onRefresh={refreshHolidays}
            showActions={true}
          />
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('admin.myRequests.profile.title')}</h2>
          
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{t('admin.myRequests.profile.personalInfo')}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    await refreshHolidays();
                    await refreshUserData();
                  }}
                  className="text-xs"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t('admin.myRequests.profile.refresh')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={user?.avatarUrl || ''} 
                    alt={user?.name || 'Administrator'} 
                  />
                  <AvatarFallback className="text-xl font-medium bg-blue-100 text-blue-700">
                    {getUserInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                  <p className="text-gray-600">{user?.email}</p>
                  <Badge variant={user?.status === 'active' ? 'default' : 'secondary'}>
                    {user?.status === 'active' ? t('admin.myRequests.profile.active') : t('admin.myRequests.profile.pending')}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('admin.myRequests.profile.role')}</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {user?.role === 'admin' ? t('admin.myRequests.profile.administrator') : t('admin.myRequests.profile.employee')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('admin.myRequests.profile.accountStatus')}</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {user?.status === 'active' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">{t('admin.myRequests.profile.active')}</span>
                      </>
                    ) : user?.status === 'pending' ? (
                      <>
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-700 font-medium">{t('admin.myRequests.profile.pending')}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700 font-medium">{t('admin.myRequests.profile.inactive')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('admin.myRequests.profile.department')}</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-900">
                      {user?.departmentName || t('admin.myRequests.profile.unassigned')}
                    </span>
                  </div>
                </div>
                {stats && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('admin.myRequests.profile.annualHolidays')}</label>
                      <p className="text-sm text-gray-900 mt-1">{user?.holidayAllowance || 25} {t('admin.myRequests.profile.days')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('admin.myRequests.profile.remainingDays')}</label>
                      <p className="text-sm text-gray-900 mt-1">{(user?.holidayAllowance || 25) - stats.usedDays} {t('admin.myRequests.profile.days')}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Holiday Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.myRequests.dialogs.create.title')}</DialogTitle>
          </DialogHeader>
          <MultiStepHolidayRequest
            existingHolidays={holidays.map(holiday => ({
              startDate: holiday.startDate,
              endDate: holiday.endDate,
              status: holiday.status,
              type: holiday.type
            }))}
            onSubmit={async (data) => {
              // Show success message without auto-redirect
              console.log('Holiday request completed successfully:', data);
              
              // Refresh data BEFORE showing success message
              await handleHolidayCreated();
              
              // Get the API response data 
              const apiResponse = data.apiResponse;
              const isAutoApproved = apiResponse?.data?.status === 'approved';
              
              // Show success message based on approval mode
              if (isAutoApproved) {
                toast.success(t('admin.myRequests.messages.autoApproved'), 
                  t('admin.myRequests.messages.autoApprovedDesc')
                );
              } else {
                toast.success(t('admin.myRequests.messages.submitted'), 
                  t('admin.myRequests.messages.submittedDesc')
                );
              }
              
              // Force close and reopen dialog to refresh data
              setShowCreateDialog(false);
              // Small delay to allow state update, then reopen if user wants to create another
              setTimeout(() => {
                // Don't auto-reopen, let user manually reopen to avoid confusion
                // setShowCreateDialog(true); 
              }, 100);
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Holiday Details Modal */}
      <Dialog open={!!selectedHoliday} onOpenChange={(open) => !open && setSelectedHoliday(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.myRequests.dialogs.details.title')}</DialogTitle>
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
                    {selectedHoliday.status === 'approved' ? t('admin.myRequests.statuses.approved') : 
                     selectedHoliday.status === 'pending' ? t('admin.myRequests.statuses.pending') : 
                     selectedHoliday.status === 'rejected' ? t('admin.myRequests.statuses.rejected') : selectedHoliday.status}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">{t('admin.myRequests.dialogs.details.period')}</label>
                  <p className="mt-1 text-gray-900">
                    {formatDateRange(selectedHoliday.startDate, selectedHoliday.endDate)}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">{t('admin.myRequests.dialogs.details.workingDays')}</label>
                  <p className="mt-1 text-gray-900">{formatWorkingDays(selectedHoliday.workingDays)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">{t('admin.myRequests.dialogs.details.type')}</label>
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
                  <label className="font-medium text-gray-700">{t('admin.myRequests.dialogs.details.status')}</label>
                  <div className="mt-1">
                    <Badge className={
                      selectedHoliday.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedHoliday.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {selectedHoliday.status === 'approved' ? t('admin.myRequests.statuses.approved') : 
                       selectedHoliday.status === 'pending' ? t('admin.myRequests.statuses.pending') : 
                       selectedHoliday.status === 'rejected' ? t('admin.myRequests.statuses.rejected') : selectedHoliday.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedHoliday.notes && (
                <div>
                  <label className="font-medium text-gray-700">{t('admin.myRequests.dialogs.details.notes')}</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                    {selectedHoliday.notes}
                  </div>
                </div>
              )}

              {/* Medical Certificate Section for Sick Leave */}
              {selectedHoliday.type === 'sick' && (
                <div className="border-t pt-4">
                  <label className="font-medium text-gray-700">{t('admin.myRequests.dialogs.details.medicalCert')}</label>
                  <div className="mt-2">
                    {selectedHoliday.medicalCertificateOption === 'upload' && selectedHoliday.medicalCertificateFileName ? (
                      <div className="flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg gap-3">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <FileText className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-green-800">
                              {t('admin.myRequests.dialogs.details.certUploaded')}
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
                                const baseUrl = window.location.origin;
                                
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
                                  a.download = selectedHoliday.medicalCertificateFileName || t('admin.myRequests.messages.defaultCertName');
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  
                                  window.URL.revokeObjectURL(url);
                                } else {
                                  alert(t('admin.myRequests.messages.downloadError'));
                                }
                              } catch (error) {
                                console.error('Download error:', error);
                                alert(t('admin.myRequests.messages.downloadError'));
                              }
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t('admin.myRequests.dialogs.details.download')}
                        </Button>
                      </div>
                    ) : selectedHoliday.medicalCertificateOption === 'send_later' ? (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">
                              {t('admin.myRequests.dialogs.details.sendLater')}
                            </p>
                            <p className="text-xs text-blue-600">
                              {t('admin.myRequests.dialogs.details.certDeadline')}
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
                              {t('admin.myRequests.dialogs.details.certNotSpecified')}
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