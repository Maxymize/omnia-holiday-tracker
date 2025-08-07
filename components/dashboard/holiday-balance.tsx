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
      
      <CardContent className="space-y-6">
        {/* Main Balance Display */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-gray-900">
            {stats.remainingDays}
          </div>
          <div className="text-sm text-gray-600">
            giorni disponibili su {stats.totalAllowance}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Utilizzo ferie</span>
            <span className="font-medium">{usagePercentage.toFixed(0)}%</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{stats.usedDays} utilizzati</span>
            <span>{stats.remainingDays} rimanenti</span>
          </div>
        </div>

        {/* Pending Days Alert */}
        {stats.pendingDays > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {stats.pendingDays} giorni in attesa di approvazione
              </span>
            </div>
            <div className="text-xs text-amber-700 mt-1">
              Se approvati, rimarrebbero {stats.remainingDays - stats.pendingDays} giorni
            </div>
          </div>
        )}

        {/* Warning for low balance */}
        {stats.remainingDays <= 5 && stats.remainingDays > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                Pochi giorni rimanenti
              </span>
            </div>
            <div className="text-xs text-red-700 mt-1">
              Pianifica le tue ferie con attenzione
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Approvate</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              {stats.approvedRequests}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-gray-700">In attesa</span>
            </div>
            <div className="text-lg font-bold text-amber-600">
              {stats.pendingRequests}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Prossime</span>
            </div>
            <div className="text-lg font-bold text-blue-600">
              {stats.upcomingHolidays}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Totali</span>
            </div>
            <div className="text-lg font-bold text-gray-600">
              {stats.totalRequests}
            </div>
          </div>
        </div>

        {/* Balance Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Stato saldo:</span>
            <Badge 
              variant={stats.remainingDays > 10 ? "default" : stats.remainingDays > 5 ? "secondary" : "destructive"}
              className="text-xs"
            >
              {stats.remainingDays > 10 ? 'Ottimo' : stats.remainingDays > 5 ? 'Buono' : 'Attenzione'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}