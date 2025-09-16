'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export interface Holiday {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department?: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick' | 'personal';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes?: string;
  rejectionReason?: string;
  workingDays: number;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  // Medical certificate fields for sick leave
  medicalCertificateOption?: 'upload' | 'send_later';
  medicalCertificateFileName?: string;
  medicalCertificateFileId?: string;
  medicalCertificateStatus?: 'pending' | 'uploaded' | 'commitment_pending';
  // User info if populated (for backward compatibility)
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// Separate leave type statistics
export interface LeaveTypeStats {
  type: 'vacation' | 'personal' | 'sick';
  allowance: number; // -1 = unlimited (sick days)
  usedDays: number; // Total approved days (past + future)
  takenDays: number; // Days already taken (past dates)  
  bookedDays: number; // Days booked for future (future dates)
  pendingDays: number; // Days in pending requests
  availableDays: number; // Days available for new requests (-1 = unlimited)
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  upcomingRequests: number;
}

export interface HolidayStats {
  // Legacy fields for backward compatibility
  totalAllowance: number;
  usedDays: number; // Total approved days (past + future)
  takenDays: number; // Days already taken (past dates)
  bookedDays: number; // Days booked for future (future dates)
  pendingDays: number; // Days in pending requests
  availableDays: number; // Days available for new requests
  remainingDays: number; // For backward compatibility
  upcomingHolidays: number;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  
  // New flexible leave type system
  leaveTypes?: {
    vacation: LeaveTypeStats;
    personal: LeaveTypeStats;
    sick: LeaveTypeStats;
  };
  year?: number;
}

export interface UseHolidaysOptions {
  viewMode?: 'own' | 'team' | 'all';
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  year?: number;
  limit?: number;
  offset?: number;
}

export function useHolidays(options: UseHolidaysOptions = {}) {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [stats, setStats] = useState<HolidayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Comprehensive loop prevention system with circuit breaker
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestCountRef = useRef(0);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Circuit breaker settings
  const DEBOUNCE_DELAY = 300;
  const MAX_REQUESTS_PER_MINUTE = 5;
  const CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute

  const getBaseUrl = () => {
    return window.location.origin;
  };

  // Use refs to stabilize options and prevent infinite loops
  const paramsRef = useRef({
    viewMode: options.viewMode,
    status: options.status,
    year: options.year,
    limit: options.limit,
    offset: options.offset
  });
  
  // Update refs when options change
  paramsRef.current = {
    viewMode: options.viewMode,
    status: options.status,
    year: options.year,
    limit: options.limit,
    offset: options.offset
  };

  // Create a debounced fetch function that prevents rapid-fire requests
  const debouncedFetchHolidays = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        // Check if we should skip this request
        const now = Date.now();
        
        // Circuit breaker: check request count
        if (requestCountRef.current >= MAX_REQUESTS_PER_MINUTE) {
          console.warn(`🚫 Circuit breaker activated: Too many requests (${requestCountRef.current}). Blocking for ${CIRCUIT_BREAKER_RESET_TIME / 1000}s`);
          setError('Troppe richieste in corso. Attendere un momento...');
          setLoading(false);
          resolve();
          return;
        }
        
        if (!user || isFetchingRef.current || (now - lastFetchTimeRef.current < DEBOUNCE_DELAY)) {
          if (!user) setLoading(false);
          resolve();
          return;
        }
        
        // Increment request counter
        requestCountRef.current++;
        // API Request for holidays
        
        // Reset counter after circuit breaker time
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }
        resetTimeoutRef.current = setTimeout(() => {
          // Reset circuit breaker counter
          requestCountRef.current = 0;
        }, CIRCUIT_BREAKER_RESET_TIME);

        try {
          // Abort any existing request
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          
          // Create new abort controller
          abortControllerRef.current = new AbortController();
          
          isFetchingRef.current = true;
          lastFetchTimeRef.current = now;
          setLoading(true);
          setError(null);

          const token = localStorage.getItem('accessToken');
          if (!token) {
            throw new Error('No authentication token found');
          }

          // Build query parameters using current refs
          const params = new URLSearchParams();
          const currentParams = paramsRef.current;
          if (currentParams.viewMode) params.append('viewMode', currentParams.viewMode);
          if (currentParams.status) params.append('status', currentParams.status);
          if (currentParams.year) params.append('year', currentParams.year.toString());
          if (currentParams.limit) params.append('limit', currentParams.limit.toString());
          if (currentParams.offset) params.append('offset', currentParams.offset.toString());

          // Debug: log the parameters being sent
          console.log('🔍 DEBUG API params:', {
            viewMode: currentParams.viewMode,
            status: currentParams.status,
            year: currentParams.year,
            limit: currentParams.limit,
            offset: currentParams.offset,
            url: `${getBaseUrl()}/.netlify/functions/get-holidays?${params}`
          });

          const response = await fetch(
            `${getBaseUrl()}/.netlify/functions/get-holidays?${params}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              signal: abortControllerRef.current.signal
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch holidays');
          }

          if (data.success) {
            setHolidays(data.data.holidays || []);
            
            // Fetch flexible leave type statistics from new endpoint
            try {
              const statsParams = new URLSearchParams();
              if (currentParams.year) statsParams.append('year', currentParams.year.toString());
              
              const statsResponse = await fetch(
                `${getBaseUrl()}/.netlify/functions/get-leave-stats?${statsParams}`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  signal: abortControllerRef.current.signal
                }
              );

              if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                if (statsData.success) {
                  const leaveTypesData = statsData.data.leaveTypes;
                  const summaryData = statsData.data.summary;
                  
                  // Build flexible stats with backward compatibility
                  const flexibleStats: HolidayStats = {
                    // Legacy fields for backward compatibility (combined vacation + personal)
                    totalAllowance: summaryData.totalAllowance,
                    usedDays: summaryData.totalUsedDays,
                    takenDays: leaveTypesData.vacation.takenDays + leaveTypesData.personal.takenDays + leaveTypesData.sick.takenDays,
                    bookedDays: leaveTypesData.vacation.bookedDays + leaveTypesData.personal.bookedDays + leaveTypesData.sick.bookedDays,
                    pendingDays: leaveTypesData.vacation.pendingDays + leaveTypesData.personal.pendingDays + leaveTypesData.sick.pendingDays,
                    availableDays: leaveTypesData.vacation.availableDays + leaveTypesData.personal.availableDays + (leaveTypesData.sick.allowance === -1 ? 0 : leaveTypesData.sick.availableDays),
                    remainingDays: summaryData.totalAvailableDays, // For backward compatibility
                    upcomingHolidays: leaveTypesData.vacation.upcomingRequests + leaveTypesData.personal.upcomingRequests + leaveTypesData.sick.upcomingRequests,
                    totalRequests: leaveTypesData.vacation.totalRequests + leaveTypesData.personal.totalRequests + leaveTypesData.sick.totalRequests,
                    approvedRequests: leaveTypesData.vacation.approvedRequests + leaveTypesData.personal.approvedRequests + leaveTypesData.sick.approvedRequests,
                    pendingRequests: leaveTypesData.vacation.pendingRequests + leaveTypesData.personal.pendingRequests + leaveTypesData.sick.pendingRequests,
                    rejectedRequests: leaveTypesData.vacation.rejectedRequests + leaveTypesData.personal.rejectedRequests + leaveTypesData.sick.rejectedRequests,
                    
                    // New flexible leave type system
                    leaveTypes: leaveTypesData,
                    year: statsData.data.year
                  };

                  // Debug logging for stats
                  console.log('📊 DEBUG Stats from server:');
                  console.log('vacation.takenDays:', leaveTypesData.vacation.takenDays);
                  console.log('personal.takenDays:', leaveTypesData.personal.takenDays);
                  console.log('sick.takenDays:', leaveTypesData.sick.takenDays);
                  console.log('Total takenDays (card):', flexibleStats.takenDays);

                  setStats(flexibleStats);
                } else {
                  console.warn('Failed to fetch leave stats, using legacy calculation');
                  // Fallback to basic stats calculation if needed
                  setStats({
                    totalAllowance: 25,
                    usedDays: 0,
                    takenDays: 0,
                    bookedDays: 0,
                    pendingDays: 0,
                    availableDays: 25,
                    remainingDays: 25,
                    upcomingHolidays: 0,
                    totalRequests: 0,
                    approvedRequests: 0,
                    pendingRequests: 0,
                    rejectedRequests: 0,
                  });
                }
              }
            } catch (statsError) {
              console.warn('Error fetching flexible leave stats:', statsError);
              // Continue with basic functionality even if stats fail
            }
          }
          
          resolve();
        } catch (err) {
          // Handle AbortError separately (not a real error)
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('API request was cancelled (this is normal during debouncing)');
            resolve();
            return;
          }
          
          console.error('Error fetching holidays:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
          reject(err);
        } finally {
          isFetchingRef.current = false;
          setLoading(false);
        }
      }, DEBOUNCE_DELAY);
    });
  }, [user]); // Fixed: Added complete user dependency

  // Simple wrapper that calls the debounced function
  const fetchHolidays = useCallback(async () => {
    try {
      await debouncedFetchHolidays();
    } catch (err) {
      // Error already handled in debounced function
    }
  }, [debouncedFetchHolidays]);

  // Fetch data on mount and when user changes - with strict debouncing
  useEffect(() => {
    
    if (!user) {
      setLoading(false);
      return;
    }

    // Only fetch once per user change with strict initialization control
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchHolidays();
    }

    // Cleanup function to abort requests and clear timeouts
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHolidays, user]); // Fixed: Added missing dependencies

  const refreshHolidays = useCallback(() => {
    // Force refresh by resetting initialization flag
    hasInitializedRef.current = false;
    fetchHolidays();
  }, [fetchHolidays]);

  // Helper functions for filtering
  const getHolidaysByStatus = useCallback((status: Holiday['status']) => {
    return holidays.filter(holiday => holiday.status === status);
  }, [holidays]);

  const getHolidaysByType = useCallback((type: Holiday['type']) => {
    return holidays.filter(holiday => holiday.type === type);
  }, [holidays]);

  const getUpcomingHolidays = useCallback(() => {
    const today = new Date();
    return holidays.filter(holiday => {
      const startDate = new Date(holiday.startDate);
      return holiday.status === 'approved' && startDate > today;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [holidays]);

  const getRecentHolidays = useCallback((limit = 5) => {
    return holidays
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [holidays]);

  // State for completed holidays from all years
  const [completedHolidaysFromAllYears, setCompletedHolidaysFromAllYears] = useState<Holiday[]>([]);

  // Function to fetch completed holidays from all years
  const fetchCompletedHolidaysFromAllYears = useCallback(async () => {
    // If we already have completed holidays from current data, don't fetch
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizeDate = (dateString: string) => {
      return new Date(dateString + 'T00:00:00');
    };

    const currentCompleted = holidays
      .filter(holiday => {
        const endDate = normalizeDate(holiday.endDate);
        return holiday.status === 'approved' && endDate <= today;
      });

    // If we have completed holidays in current data or no stats showing taken days, return
    if (currentCompleted.length > 0 || !stats || stats.takenDays === 0) {
      setCompletedHolidaysFromAllYears([]);
      return;
    }

    console.log('🔍 No completed holidays in current year, fetching all years...');

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch holidays from all years without year filter
      const fetchUrl = `${getBaseUrl()}/.netlify/functions/get-holidays?limit=100`;
      console.log('🔍 Fetching from URL:', fetchUrl);

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      console.log('🔍 Fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Fetch response data FULL:', data);
        console.log('🔍 Fetch response data:', {
          success: data.success,
          holidaysCount: data.data?.holidays?.length,
          sampleHolidays: data.data?.holidays?.slice(0, 3)
        });

        if (data.success && data.data && data.data.holidays) {
          const allHolidays = data.data.holidays;
          console.log('🔍 Processing', allHolidays.length, 'holidays from fetch...');

          const allCompleted = allHolidays
            .filter((holiday: any) => {
              const endDate = normalizeDate(holiday.endDate);
              const isApproved = holiday.status === 'approved';
              const isEnded = endDate <= today;

              console.log(`🔍 Holiday ${holiday.id}: ${holiday.type} ${holiday.startDate}-${holiday.endDate} status:${holiday.status} approved:${isApproved} ended:${isEnded}`);

              return isApproved && isEnded;
            })
            .sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

          console.log('🔍 Found completed holidays from all years:', allCompleted.length);
          console.log('🔍 Completed holidays details:', allCompleted.map(h => ({ id: h.id, type: h.type, dates: `${h.startDate}-${h.endDate}`, status: h.status })));

          setCompletedHolidaysFromAllYears(allCompleted);
        } else {
          console.log('🔍 No data.success or data.holidays');
        }
      } else {
        console.log('🔍 Fetch failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching all years holidays:', error);
    }
  }, [holidays, stats]);

  // Trigger fetch when stats are loaded and no current completed holidays
  useEffect(() => {
    if (stats && stats.takenDays > 0) {
      fetchCompletedHolidaysFromAllYears();
    }
  }, [stats, fetchCompletedHolidaysFromAllYears]);

  const getCompletedHolidays = useCallback((limit = 15) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper function to normalize date strings for comparison
    const normalizeDate = (dateString: string) => {
      const date = new Date(dateString + 'T00:00:00'); // Force local timezone
      date.setHours(0, 0, 0, 0); // Ensure clean comparison
      return date;
    };

    // First try with current holidays (might be filtered by year)
    const currentCompleted = holidays
      .filter(holiday => {
        const endDate = normalizeDate(holiday.endDate);
        const isApproved = holiday.status === 'approved';
        const isEnded = endDate <= today;

        // Remove debug logs now that issue is resolved

        return isApproved && isEnded;
      })
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

    // If we have current completed holidays, use them
    let completed = currentCompleted;

    // Otherwise, use the fetched holidays from all years
    if (currentCompleted.length === 0 && completedHolidaysFromAllYears.length > 0) {
      completed = completedHolidaysFromAllYears;
      console.log('🔍 Using completed holidays from all years:', completed.length);
    }

    // Debug logging
    console.log('🔍 DEBUG getCompletedHolidays:');
    console.log('Today:', today.toISOString().split('T')[0]);
    console.log('Total holidays in memory:', holidays.length);
    console.log('Current completed:', currentCompleted.length);
    console.log('All years completed:', completedHolidaysFromAllYears.length);
    console.log('Final completed holidays:', completed.length);

    if (holidays.length > 0) {
      // Show sample of current holidays with their status and dates
      const sampleHolidays = holidays.slice(0, 5).map(h => ({
        id: h.id,
        type: h.type,
        startDate: h.startDate,
        endDate: h.endDate,
        status: h.status,
        endDateNormalized: normalizeDate(h.endDate).toISOString().split('T')[0],
        isApproved: h.status === 'approved',
        isEnded: normalizeDate(h.endDate) <= today
      }));
      console.table(sampleHolidays);
    }

    return completed.slice(0, limit);
  }, [holidays, completedHolidaysFromAllYears]);

  return {
    holidays,
    stats,
    loading,
    error,
    refreshHolidays,
    getHolidaysByStatus,
    getHolidaysByType,
    getUpcomingHolidays,
    getRecentHolidays,
    getCompletedHolidays,
  };
}