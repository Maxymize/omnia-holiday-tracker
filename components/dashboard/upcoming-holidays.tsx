'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Holiday } from '@/lib/hooks/useHolidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, User, Users, ChevronRight, Plus } from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UpcomingHolidaysProps {
  holidays: Holiday[];
  loading?: boolean;
  showTeam?: boolean;
  onCreateRequest?: () => void;
  className?: string;
}

export function UpcomingHolidays({ 
  holidays, 
  loading = false, 
  showTeam = false,
  onCreateRequest,
  className 
}: UpcomingHolidaysProps) {
  const { t, locale } = useTranslation();
  const [viewMode, setViewMode] = useState<'own' | 'team'>('own');

  // Get date-fns locale
  const getDateLocale = () => {
    switch (locale) {
      case 'it': return it;
      case 'es': return es;
      default: return enUS;
    }
  };

  // Filter and sort upcoming holidays
  const now = new Date();
  const upcomingHolidays = holidays
    .filter(holiday => {
      const startDate = new Date(holiday.startDate);
      const isUpcoming = holiday.status === 'approved' && startDate >= now;
      
      if (!showTeam) return isUpcoming;
      
      // If showing team, filter based on view mode
      if (viewMode === 'own') {
        return isUpcoming && holiday.employeeId === 'current_user'; // Should be replaced with actual user ID
      }
      return isUpcoming;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10); // Show max 10 upcoming holidays

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

  const formatDateInfo = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateLocale = getDateLocale();
    
    // Special handling for dates
    if (isToday(start)) {
      return {
        primary: t('dashboard.calendar.today'),
        secondary: format(start, 'dd MMM', { locale: dateLocale }),
        urgent: true
      };
    }
    
    if (isTomorrow(start)) {
      return {
        primary: t('common.tomorrow') || 'Tomorrow', // Add this to translations if needed
        secondary: format(start, 'dd MMM', { locale: dateLocale }),
        urgent: true
      };
    }
    
    if (isThisWeek(start)) {
      return {
        primary: format(start, 'EEEE', { locale: dateLocale }),
        secondary: format(start, 'dd MMM', { locale: dateLocale }),
        urgent: false
      };
    }
    
    // Default formatting
    const timeUntil = formatDistanceToNow(start, { 
      locale: dateLocale,
      addSuffix: true 
    });
    
    return {
      primary: format(start, 'dd MMM', { locale: dateLocale }),
      secondary: timeUntil,
      urgent: false
    };
  };

  const formatDuration = (startDate: string, endDate: string, workingDays: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return locale === 'it' ? '1 giorno' : locale === 'es' ? '1 día' : '1 day';
    }
    
    const dayLabel = locale === 'it' ? 'giorni' : locale === 'es' ? 'días' : 'days';
    return `${workingDays} ${dayLabel}`;
  };

  const getUserInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('dashboard.stats.upcomingHolidays')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('dashboard.stats.upcomingHolidays')}</span>
          </CardTitle>
          
          {showTeam && (
            <div className="flex items-center space-x-1">
              <Button
                variant={viewMode === 'own' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('own')}
                className="text-xs"
              >
                <User className="h-3 w-3 mr-1" />
                {t('dashboard.calendar.myHolidays')}
              </Button>
              <Button
                variant={viewMode === 'team' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('team')}
                className="text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                {t('dashboard.calendar.teamHolidays')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {upcomingHolidays.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {t('dashboard.holidays.noRequests')}
              </h3>
              <p className="text-xs text-gray-600">
                {viewMode === 'own' 
                  ? (locale === 'it' ? 'Le tue prossime ferie appariranno qui' : 
                     locale === 'es' ? 'Tus próximas vacaciones aparecerán aquí' : 
                     'Your upcoming holidays will appear here')
                  : (locale === 'it' ? 'Nessuna ferie del team in programma' :
                     locale === 'es' ? 'No hay vacaciones del equipo programadas' :
                     'No team holidays scheduled')
                }
              </p>
            </div>
            {onCreateRequest && viewMode === 'own' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateRequest}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('dashboard.calendar.newRequest')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingHolidays.map((holiday) => {
              const dateInfo = formatDateInfo(holiday.startDate, holiday.endDate);
              const duration = formatDuration(holiday.startDate, holiday.endDate, holiday.workingDays);
              
              return (
                <div
                  key={holiday.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                    dateInfo.urgent 
                      ? "bg-blue-50 border-blue-200" 
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {/* User Avatar or Type Icon */}
                  <div className="relative">
                    {showTeam && holiday.user ? (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs font-medium">
                          {getUserInitials(holiday.user.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-lg">
                        {getTypeIcon(holiday.type)}
                      </div>
                    )}
                    
                    {dateInfo.urgent && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <Clock className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Holiday Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {showTeam && holiday.user ? holiday.user.name : getTypeLabel(holiday.type)}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {duration}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span className={cn(
                        "font-medium",
                        dateInfo.urgent && "text-blue-700"
                      )}>
                        {dateInfo.primary}
                      </span>
                      <span>•</span>
                      <span>{dateInfo.secondary}</span>
                      {showTeam && (
                        <>
                          <span>•</span>
                          <span>{getTypeLabel(holiday.type)}</span>
                        </>
                      )}
                    </div>

                    {holiday.notes && (
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {holiday.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Arrow */}
                  <div className="flex-shrink-0">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              );
            })}

            {/* Show more link if there are more holidays */}
            {holidays.filter(h => new Date(h.startDate) >= now && h.status === 'approved').length > 10 && (
              <div className="text-center pt-2 border-t">
                <Button variant="ghost" size="sm" className="text-xs">
                  {locale === 'it' ? `Vedi altre (${holidays.length - 10})` :
                   locale === 'es' ? `Ver más (${holidays.length - 10})` :
                   `Show more (${holidays.length - 10})`}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}