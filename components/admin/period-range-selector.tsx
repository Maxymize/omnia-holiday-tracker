'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  Info
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, startOfQuarter, endOfQuarter, differenceInDays, isValid } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';
import { createReportPeriod } from '@/lib/export/report-data';
import { ReportPeriod } from '@/lib/export/types';
import { cn } from '@/lib/utils';

interface PeriodRangeSelectorProps {
  value?: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
  language?: 'it' | 'en' | 'es';
  className?: string;
}

type PeriodType = 'month' | 'quarter' | 'year' | 'previousYear' | 'custom' | 'last30' | 'last60' | 'last90';

export function PeriodRangeSelector({
  value,
  onChange,
  language = 'it',
  className
}: PeriodRangeSelectorProps) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<PeriodType>(value?.type || 'month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    value?.type === 'custom' ? value.startDate : undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    value?.type === 'custom' ? value.endDate : undefined
  );
  const [error, setError] = useState<string | null>(null);

  const getDateLocale = () => {
    switch (language) {
      case 'it': return it;
      case 'es': return es;
      default: return enUS;
    }
  };

  const periodOptions = [
    {
      type: 'month' as PeriodType,
      label: t('admin.reports.periods.thisMonth'),
      description: t('admin.reports.periods.descriptions.currentMonth'),
      icon: CalendarIcon,
      badge: t('admin.reports.periods.badges.current'),
      badgeVariant: 'default' as const
    },
    {
      type: 'quarter' as PeriodType,
      label: t('admin.reports.periods.thisQuarter'),
      description: t('admin.reports.periods.descriptions.currentQuarter'),
      icon: CalendarDays,
      badge: t('admin.reports.periods.badges.quarter'),
      badgeVariant: 'secondary' as const
    },
    {
      type: 'year' as PeriodType,
      label: t('admin.reports.periods.thisYear'),
      description: t('admin.reports.periods.descriptions.currentYear'),
      icon: CalendarDays,
      badge: t('admin.reports.periods.badges.year'),
      badgeVariant: 'secondary' as const
    },
    {
      type: 'previousYear' as PeriodType,
      label: t('admin.reports.periods.previousYear'),
      description: t('admin.reports.periods.descriptions.previousYear'),
      icon: Clock,
      badge: t('admin.reports.periods.badges.previous'),
      badgeVariant: 'outline' as const
    },
    {
      type: 'last30' as PeriodType,
      label: t('admin.reports.periods.last30'),
      description: t('admin.reports.periods.descriptions.last30'),
      icon: TrendingUp,
      badge: t('admin.reports.periods.badges.days30'),
      badgeVariant: 'outline' as const
    },
    {
      type: 'last60' as PeriodType,
      label: t('admin.reports.periods.last60'),
      description: t('admin.reports.periods.descriptions.last60'),
      icon: TrendingUp,
      badge: t('admin.reports.periods.badges.days60'),
      badgeVariant: 'outline' as const
    },
    {
      type: 'last90' as PeriodType,
      label: t('admin.reports.periods.last90'),
      description: t('admin.reports.periods.descriptions.last90'),
      icon: TrendingUp,
      badge: t('admin.reports.periods.badges.days90'),
      badgeVariant: 'outline' as const
    },
    {
      type: 'custom' as PeriodType,
      label: t('admin.reports.periods.custom'),
      description: t('admin.reports.periods.descriptions.custom'),
      icon: CalendarIcon,
      badge: t('admin.reports.periods.badges.custom'),
      badgeVariant: 'default' as const
    }
  ];

  // Generate period preview
  const generatePeriodPreview = (type: PeriodType, customStart?: Date, customEnd?: Date) => {
    const locale = getDateLocale();
    const now = new Date();

    try {
      let startDate: Date;
      let endDate: Date;
      let dayCount: number;

      switch (type) {
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'quarter':
          startDate = startOfQuarter(now);
          endDate = endOfQuarter(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        case 'previousYear':
          const prevYear = subYears(now, 1);
          startDate = startOfYear(prevYear);
          endDate = endOfYear(prevYear);
          break;
        case 'last30':
          endDate = now;
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'last60':
          endDate = now;
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 60);
          break;
        case 'last90':
          endDate = now;
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 90);
          break;
        case 'custom':
          if (!customStart || !customEnd) return null;
          startDate = customStart;
          endDate = customEnd;
          break;
        default:
          return null;
      }

      dayCount = differenceInDays(endDate, startDate) + 1;

      return {
        startDate,
        endDate,
        dayCount,
        preview: `${format(startDate, 'dd MMM yyyy', { locale })} - ${format(endDate, 'dd MMM yyyy', { locale })}`,
        duration: `${dayCount} ${t('admin.reports.periods.duration.days')}`
      };
    } catch (error) {
      return null;
    }
  };

  const preview = generatePeriodPreview(selectedType, customStartDate, customEndDate);

  // Handle period change
  const handlePeriodChange = (type: PeriodType) => {
    setSelectedType(type);
    setError(null);

    if (type !== 'custom') {
      // Clear custom dates when switching away from custom
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);

      // Auto-generate period for non-custom types
      try {
        let period: ReportPeriod;

        if (type === 'last30' || type === 'last60' || type === 'last90') {
          // Handle "lastX" types by converting to custom with calculated dates
          const days = parseInt(type.replace('last', ''));
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);

          period = createReportPeriod('custom', startDate, endDate, language);
          period.type = type; // Keep original type for labeling
        } else {
          period = createReportPeriod(type, undefined, undefined, language);
        }

        onChange(period);
      } catch (error) {
        console.error('Error creating period:', error);
        setError(t('admin.reports.periods.errors.selectionError'));
      }
    }
  };

  // Handle custom date changes
  const handleCustomDateChange = () => {
    if (!customStartDate || !customEndDate) return;

    if (!isValid(customStartDate) || !isValid(customEndDate)) {
      setError(t('admin.reports.periods.errors.invalidDates'));
      return;
    }

    if (customStartDate > customEndDate) {
      setError(t('admin.reports.periods.errors.startAfterEnd'));
      return;
    }

    // Check if date range is too large (more than 2 years)
    const dayDiff = differenceInDays(customEndDate, customStartDate);
    if (dayDiff > 730) {
      setError(t('admin.reports.periods.errors.tooLong'));
      return;
    }

    setError(null);

    try {
      const period = createReportPeriod('custom', customStartDate, customEndDate, language);
      onChange(period);
    } catch (error) {
      console.error('Error creating custom period:', error);
      setError(t('admin.reports.periods.errors.customCreationError'));
    }
  };

  // Auto-update custom period when dates change
  useEffect(() => {
    if (selectedType === 'custom' && customStartDate && customEndDate) {
      handleCustomDateChange();
    }
  }, [customStartDate, customEndDate, selectedType]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarDays className="h-5 w-5" />
          <span>{t('admin.reports.periods.title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {periodOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedType === option.type;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => handlePeriodChange(option.type)}
                className={cn(
                  "flex items-center justify-between p-3 border rounded-lg text-left transition-all duration-200",
                  "hover:bg-gray-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-full border-2 transition-colors",
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300 bg-white"
                  )}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isSelected ? "text-blue-600" : "text-gray-500"
                  )} />
                  <div>
                    <div className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-blue-900" : "text-gray-900"
                    )}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </div>
                <Badge variant={isSelected ? "default" : option.badgeVariant}>
                  {option.badge}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Custom Date Selection */}
        {selectedType === 'custom' && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{t('admin.reports.periods.customTitle')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>{t('admin.reports.periods.startDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? (
                        format(customStartDate, "dd MMM yyyy", { locale: getDateLocale() })
                      ) : (
                        <span>{t('admin.reports.periods.selectStartDate')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      disabled={(date) => date > new Date() || Boolean(customEndDate && date > customEndDate)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>{t('admin.reports.periods.endDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? (
                        format(customEndDate, "dd MMM yyyy", { locale: getDateLocale() })
                      ) : (
                        <span>{t('admin.reports.periods.selectEndDate')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      disabled={(date) => date > new Date() || Boolean(customStartDate && date < customStartDate)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Preview and Tips - Horizontal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Period Preview - Compact */}
          {preview && (
            <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">{t('admin.reports.periods.preview')}</span>
                  <span className="text-blue-700">
                    {format(preview.startDate, 'dd MMM', { locale: getDateLocale() })} → {format(preview.endDate, 'dd MMM yyyy', { locale: getDateLocale() })}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">{preview.duration}</Badge>
              </div>
            </div>
          )}

          {/* Quick Tips - Compact */}
          <details className="group">
            <summary className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">{t('admin.reports.periods.tips.title')}</span>
              </div>
              <div className="text-yellow-600 group-open:rotate-180 transition-transform duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg border-t-0 rounded-t-none">
              <div className="text-xs text-yellow-800 space-y-1">
                <div>• <strong>{t('admin.reports.periods.tips.currentMonth.title')}</strong> {t('admin.reports.periods.tips.currentMonth.desc')}</div>
                <div>• <strong>{t('admin.reports.periods.tips.quarterYear.title')}</strong> {t('admin.reports.periods.tips.quarterYear.desc')}</div>
                <div>• <strong>{t('admin.reports.periods.tips.rollingPeriods.title')}</strong> {t('admin.reports.periods.tips.rollingPeriods.desc')}</div>
                <div>• <strong>{t('admin.reports.periods.tips.customRange.title')}</strong> {t('admin.reports.periods.tips.customRange.desc')}</div>
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}