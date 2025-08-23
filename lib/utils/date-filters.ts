import { subMonths, startOfYear, format } from 'date-fns';

export type DateRangeFilter = 'all' | 'yearToDate' | 'last12Months' | 'last6Months' | 'last3Months';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Calculate date range based on filter type
 * Returns dates in YYYY-MM-DD format for API compatibility
 */
export function calculateDateRange(filter: DateRangeFilter): DateRange {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  switch (filter) {
    case 'all':
      return {}; // No date filtering

    case 'yearToDate':
      const yearStart = startOfYear(now);
      return {
        startDate: format(yearStart, 'yyyy-MM-dd'),
        endDate: today
      };

    case 'last12Months':
      const twelveMonthsAgo = subMonths(now, 12);
      return {
        startDate: format(twelveMonthsAgo, 'yyyy-MM-dd'),
        endDate: today
      };

    case 'last6Months':
      const sixMonthsAgo = subMonths(now, 6);
      return {
        startDate: format(sixMonthsAgo, 'yyyy-MM-dd'),
        endDate: today
      };

    case 'last3Months':
      const threeMonthsAgo = subMonths(now, 3);
      return {
        startDate: format(threeMonthsAgo, 'yyyy-MM-dd'),
        endDate: today
      };

    default:
      return {};
  }
}

/**
 * Build query string parameters for date filtering
 */
export function buildDateFilterParams(filter: DateRangeFilter): string {
  const range = calculateDateRange(filter);
  const params = new URLSearchParams();
  
  if (range.startDate) {
    params.set('startDate', range.startDate);
  }
  
  if (range.endDate) {
    params.set('endDate', range.endDate);
  }
  
  return params.toString();
}

/**
 * Check if a date falls within the specified filter range
 * Used for client-side filtering if needed
 */
export function isDateInRange(dateStr: string, filter: DateRangeFilter): boolean {
  if (filter === 'all') return true;
  
  const date = new Date(dateStr);
  const range = calculateDateRange(filter);
  
  if (range.startDate) {
    const startDate = new Date(range.startDate);
    if (date < startDate) return false;
  }
  
  if (range.endDate) {
    const endDate = new Date(range.endDate);
    if (date > endDate) return false;
  }
  
  return true;
}