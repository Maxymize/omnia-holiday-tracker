'use client';

import { useTranslation } from '@/lib/i18n/provider';
import { HolidayStats, LeaveTypeStats } from '@/lib/hooks/useHolidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Clock, CheckCircle, AlertTriangle, Plane, Heart, Stethoscope, Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HolidayBalanceUser {
  id: string;
  name: string;
  email: string;
  holidayAllowance?: number; // Made optional to match useAuth User type
  // other user properties...
}

interface HolidayBalanceProps {
  stats: HolidayStats | null;
  user?: HolidayBalanceUser | null;
  loading?: boolean;
  className?: string;
}

// Helper function to render individual leave type card
interface LeaveTypeCardProps {
  type: 'vacation' | 'personal' | 'sick';
  stats: LeaveTypeStats;
  className?: string;
}

function LeaveTypeCard({ type, stats, className }: LeaveTypeCardProps) {
  // Theme configuration for each leave type
  const themeConfig = {
    vacation: {
      label: 'Ferie',
      icon: Plane,
      emoji: '🏖️',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      progressColor: 'bg-emerald-500',
      textColor: 'text-emerald-800'
    },
    personal: {
      label: 'Permessi',
      icon: Heart,
      emoji: '👤',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      progressColor: 'bg-blue-500',
      textColor: 'text-blue-800'
    },
    sick: {
      label: 'Malattia',
      icon: Stethoscope,
      emoji: '🏥',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      progressColor: 'bg-red-500',
      textColor: 'text-red-800'
    }
  };

  const theme = themeConfig[type];
  const Icon = theme.icon;
  const isUnlimited = stats.allowance === -1;
  
  // Calculate progress for limited allowances
  const usagePercentage = !isUnlimited && stats.allowance > 0 
    ? (stats.usedDays / stats.allowance) * 100 
    : 0;

  // Determine status badge
  const getStatusBadge = () => {
    if (isUnlimited) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">Illimitati</Badge>;
    }
    
    if (stats.availableDays <= 2) {
      return <Badge variant="destructive" className="text-xs">Attenzione</Badge>;
    } else if (stats.availableDays <= 5) {
      return <Badge variant="secondary" className="text-xs">Limitati</Badge>;
    } else {
      return <Badge variant="default" className="text-xs">Disponibili</Badge>;
    }
  };

  return (
    <div className={cn(
      "border rounded-lg p-3 space-y-3",
      theme.bgColor,
      theme.borderColor,
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{theme.emoji}</span>
          <span className={cn("font-medium text-sm", theme.textColor)}>{theme.label}</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Main Numbers */}
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className={cn("text-lg font-bold", theme.textColor)}>
            {isUnlimited ? <Infinity className="h-5 w-5 mx-auto" /> : stats.availableDays}
          </div>
          <div className="text-xs text-gray-600">
            {isUnlimited ? 'giorni disponibili' : `disponibili su ${stats.allowance}`}
          </div>
        </div>
        
        {!isUnlimited && (
          <div className="flex-1 mx-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Uso: {usagePercentage.toFixed(0)}%</span>
              {stats.pendingDays > 0 && (
                <span className="text-amber-600">{stats.pendingDays} attesa</span>
              )}
            </div>
            <Progress 
              value={usagePercentage} 
              className="h-1.5"
              style={{
                backgroundColor: 'rgb(229 231 235)', // gray-200
              }}
            />
          </div>
        )}
        
        <div className="text-center">
          <div className={cn("text-lg font-bold", theme.textColor)}>{stats.usedDays}</div>
          <div className="text-xs text-gray-600">utilizzati</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className={cn("font-medium", theme.textColor)}>{stats.approvedRequests}</div>
          <div className="text-gray-600">Approvate</div>
        </div>
        <div className="text-center">
          <div className={cn("font-medium", theme.textColor)}>{stats.pendingRequests}</div>
          <div className="text-gray-600">In attesa</div>
        </div>
        <div className="text-center">
          <div className={cn("font-medium", theme.textColor)}>{stats.upcomingRequests}</div>
          <div className="text-gray-600">Prossime</div>
        </div>
      </div>
    </div>
  );
}

export function HolidayBalance({ stats, user, loading = false, className }: HolidayBalanceProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Saldo Permessi</span>
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
            <span>Saldo Permessi</span>
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

  // Check if flexible leave type system is available
  const hasFlexibleSystem = stats.leaveTypes && Object.keys(stats.leaveTypes).length > 0;
  
  if (hasFlexibleSystem) {
    // NEW: Flexible leave type system with separate cards
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Saldo Permessi {stats.year || new Date().getFullYear()}</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Sistema Flessibile
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Horizontal layout for leave type cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {stats.leaveTypes?.vacation && (
              <LeaveTypeCard
                type="vacation"
                stats={stats.leaveTypes.vacation}
              />
            )}
            
            {stats.leaveTypes?.personal && (
              <LeaveTypeCard
                type="personal"
                stats={stats.leaveTypes.personal}
              />
            )}
            
            {stats.leaveTypes?.sick && (
              <LeaveTypeCard
                type="sick"
                stats={stats.leaveTypes.sick}
              />
            )}
          </div>

          {/* Summary Overview */}
          <div className="border-t pt-3 mt-4">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-bold text-gray-900">{stats.totalRequests}</div>
                <div className="text-gray-600">Richieste Totali</div>
              </div>
              <div>
                <div className="font-bold text-green-600">{stats.approvedRequests}</div>
                <div className="text-gray-600">Approvate</div>
              </div>
              <div>
                <div className="font-bold text-amber-600">{stats.pendingRequests}</div>
                <div className="text-gray-600">In Attesa</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // FALLBACK: Legacy system display for backward compatibility
  const totalAllowance = user?.holidayAllowance || stats.totalAllowance;
  const remainingDays = totalAllowance - stats.usedDays;
  
  const usagePercentage = (stats.usedDays / totalAllowance) * 100;
  
  // Determine color based on remaining days
  const getRemainingDaysColor = () => {
    if (remainingDays <= 5) return 'text-red-600';
    if (remainingDays <= 10) return 'text-amber-600';
    return 'text-green-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Saldo Ferie {new Date().getFullYear()}</span>
          </div>
          <Badge variant="outline" className="bg-gray-50 text-gray-600">
            Sistema Tradizionale
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="py-2">
        {/* Compact Balance Display */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <div className={cn("text-2xl font-bold", getRemainingDaysColor())}>{remainingDays}</div>
            <div className="text-xs text-gray-600">giorni disponibili su {totalAllowance}</div>
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
            variant={remainingDays > 10 ? "default" : remainingDays > 5 ? "secondary" : "destructive"}
            className="text-xs"
          >
            {remainingDays > 10 ? 'Ottimo' : remainingDays > 5 ? 'Buono' : 'Attenzione'}
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