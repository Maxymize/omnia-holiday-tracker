'use client';

import { useTranslation } from '@/lib/i18n/provider';
import { HolidayStats } from '@/lib/hooks/useHolidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HolidayBalanceProps {
  stats: HolidayStats | null;
  loading?: boolean;
  className?: string;
}

export function HolidayBalance({ stats, loading = false, className }: HolidayBalanceProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Saldo Ferie</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Saldo Ferie</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-600">Nessun dato disponibile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = (stats.usedDays / stats.totalAllowance) * 100;
  const pendingPercentage = (stats.pendingDays / stats.totalAllowance) * 100;
  
  // Determine color based on remaining days
  const getRemainingDaysColor = () => {
    const remaining = stats.remainingDays;
    if (remaining <= 5) return 'text-red-600';
    if (remaining <= 10) return 'text-amber-600';
    return 'text-green-600';
  };

  const getUsageColor = () => {
    if (usagePercentage >= 90) return 'bg-red-500';
    if (usagePercentage >= 70) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Saldo Ferie {new Date().getFullYear()}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="py-2">
        {/* Compact Balance Display */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.remainingDays}</div>
            <div className="text-xs text-gray-600">giorni disponibili su {stats.totalAllowance}</div>
          </div>
          
          {/* Usage Progress - Compact */}
          <div className="flex-1 mx-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Utilizzo {usagePercentage.toFixed(0)}%</span>
              {stats.pendingDays > 0 && (
                <span className="text-amber-600">{stats.pendingDays} in attesa</span>
              )}
            </div>
            <Progress value={usagePercentage} className="h-1" />
          </div>

          {/* Status Badge */}
          <Badge 
            variant={stats.remainingDays > 10 ? "default" : stats.remainingDays > 5 ? "secondary" : "destructive"}
            className="text-xs"
          >
            {stats.remainingDays > 10 ? 'Ottimo' : stats.remainingDays > 5 ? 'Buono' : 'Attenzione'}
          </Badge>
        </div>

        {/* Compact Stats Row with Labels */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="font-medium">{stats.approvedRequests}</span>
            <span className="text-gray-600">Approvate</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-amber-600" />
            <span className="font-medium">{stats.pendingRequests}</span>
            <span className="text-gray-600">In attesa</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-3 w-3 text-blue-600" />
            <span className="font-medium">{stats.upcomingHolidays}</span>
            <span className="text-gray-600">Prossime</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3 text-gray-600" />
            <span className="font-medium">{stats.totalRequests}</span>
            <span className="text-gray-600">Totali</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}