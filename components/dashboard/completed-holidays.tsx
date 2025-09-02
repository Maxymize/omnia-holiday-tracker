'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Holiday } from '@/lib/hooks/useHolidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, Clock, User, Users, ChevronRight, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CompletedHolidaysProps {
  holidays: Holiday[];
  loading?: boolean;
  showTeam?: boolean;
  onHolidayClick?: (holiday: Holiday) => void;
  className?: string;
}

export function CompletedHolidays({ 
  holidays, 
  loading = false, 
  showTeam = false,
  onHolidayClick,
  className 
}: CompletedHolidaysProps) {
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

  // Filter and sort completed holidays (past approved holidays)
  const now = new Date();
  const completedHolidays = holidays
    .filter(holiday => {
      const endDate = new Date(holiday.endDate);
      // Only show approved holidays that have ended
      const isCompleted = holiday.status === 'approved' && endDate < now;
      
      if (!showTeam) return isCompleted;
      
      // If showing team, filter based on view mode
      if (viewMode === 'own') {
        return isCompleted && holiday.employeeId === 'current_user'; // Should be replaced with actual user ID
      }
      return isCompleted;
    })
    .sort((a, b) => {
      // Sort by end date, most recent first
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    })
    .slice(0, 15); // Show max 15 most recent completed holidays

  const getTypeIcon = (type: Holiday['type']) => {
    switch (type) {
      case 'vacation': return '🏖️';
      case 'sick': return '🏥';
      case 'personal': return '👤';
      default: return '📅';
    }
  };

  const getTypeLabel = (type: Holiday['type']) => {
    return t(`dashboard.calendar.legendDetails.${type}`);
  };

  const formatCompletedDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateLocale = getDateLocale();
    
    // Format for completed holidays
    const timeAgo = formatDistanceToNow(end, { 
      locale: dateLocale,
      addSuffix: true 
    });
    
    return {
      primary: format(start, 'dd MMM', { locale: dateLocale }),
      secondary: timeAgo,
      range: start.toDateString() === end.toDateString() 
        ? format(start, 'dd MMM yyyy', { locale: dateLocale })
        : `${format(start, 'dd MMM', { locale: dateLocale })} - ${format(end, 'dd MMM yyyy', { locale: dateLocale })}`
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
            <CheckCircle2 className="h-5 w-5" />
            <span>
              {locale === 'it' ? 'Ferie Godute' : 
               locale === 'es' ? 'Vacaciones Disfrutadas' : 
               'Completed Holidays'}
            </span>
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
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>
              {locale === 'it' ? 'Ferie Godute' : 
               locale === 'es' ? 'Vacaciones Disfrutadas' : 
               'Completed Holidays'}
            </span>
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
        {completedHolidays.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {locale === 'it' ? 'Nessuna feria completata' :
                 locale === 'es' ? 'No hay vacaciones completadas' :
                 'No completed holidays'}
              </h3>
              <p className="text-xs text-gray-600">
                {viewMode === 'own' 
                  ? (locale === 'it' ? 'Le ferie completate appariranno qui' : 
                     locale === 'es' ? 'Las vacaciones completadas aparecerán aquí' : 
                     'Your completed holidays will appear here')
                  : (locale === 'it' ? 'Nessuna feria del team completata' :
                     locale === 'es' ? 'No hay vacaciones del equipo completadas' :
                     'No team holidays completed')
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {completedHolidays.map((holiday) => {
              const dateInfo = formatCompletedDate(holiday.startDate, holiday.endDate);
              const duration = formatDuration(holiday.startDate, holiday.endDate, holiday.workingDays);
              
              return (
                <div
                  key={holiday.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                    "bg-green-50 border-green-200 hover:bg-green-100",
                    onHolidayClick && "cursor-pointer hover:shadow-sm"
                  )}
                  onClick={() => onHolidayClick?.(holiday)}
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
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-green-200 flex items-center justify-center text-lg">
                        {getTypeIcon(holiday.type)}
                      </div>
                    )}
                    
                    {/* Completed indicator */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-2 w-2 text-white" />
                    </div>
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
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        {locale === 'it' ? 'Completata' :
                         locale === 'es' ? 'Completada' :
                         'Completed'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span className="font-medium text-green-700">
                        {dateInfo.primary}
                      </span>
                      <span>•</span>
                      <span>{dateInfo.secondary}</span>
                      <span>•</span>
                      <span className="font-medium text-green-600">
                        {dateInfo.range}
                      </span>
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

            {/* Show more link if there are more completed holidays */}
            {holidays.filter(h => 
              new Date(h.endDate) < now && h.status === 'approved'
            ).length > 15 && (
              <div className="text-center pt-2 border-t">
                <Button variant="ghost" size="sm" className="text-xs">
                  {locale === 'it' ? `Vedi altre (${holidays.filter(h => 
                    new Date(h.endDate) < now && h.status === 'approved'
                  ).length - 15})` :
                   locale === 'es' ? `Ver más (${holidays.filter(h => 
                    new Date(h.endDate) < now && h.status === 'approved'
                   ).length - 15})` :
                   `Show more (${holidays.filter(h => 
                    new Date(h.endDate) < now && h.status === 'approved'
                   ).length - 15})`}
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