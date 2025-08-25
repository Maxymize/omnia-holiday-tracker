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
    return process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : window.location.origin;
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
        console.log(`🔄 API Request #${requestCountRef.current} for holidays (viewMode: ${paramsRef.current.viewMode})`);
        
        // Reset counter after circuit breaker time
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }
        resetTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Resetting circuit breaker counter');
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
                    takenDays: leaveTypesData.vacation.takenDays + leaveTypesData.personal.takenDays,
                    bookedDays: leaveTypesData.vacation.bookedDays + leaveTypesData.personal.bookedDays,
                    pendingDays: summaryData.totalPendingDays,
                    availableDays: summaryData.totalAvailableDays,
                    remainingDays: summaryData.totalAvailableDays, // For backward compatibility
                    upcomingHolidays: leaveTypesData.vacation.upcomingRequests + leaveTypesData.personal.upcomingRequests,
                    totalRequests: leaveTypesData.vacation.totalRequests + leaveTypesData.personal.totalRequests + leaveTypesData.sick.totalRequests,
                    approvedRequests: leaveTypesData.vacation.approvedRequests + leaveTypesData.personal.approvedRequests + leaveTypesData.sick.approvedRequests,
                    pendingRequests: leaveTypesData.vacation.pendingRequests + leaveTypesData.personal.pendingRequests + leaveTypesData.sick.pendingRequests,
                    rejectedRequests: leaveTypesData.vacation.rejectedRequests + leaveTypesData.personal.rejectedRequests + leaveTypesData.sick.rejectedRequests,
                    
                    // New flexible leave type system
                    leaveTypes: leaveTypesData,
                    year: statsData.data.year
                  };

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
  }, [user?.id]); // Only depend on user ID to prevent excessive re-creation

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
    console.log('🔄 useHolidays useEffect triggered:', { user: user?.email, initialized: hasInitializedRef.current });
    
    if (!user) {
      console.log('❌ No user, setting loading to false');
      setLoading(false);
      return;
    }

    // Only fetch once per user change with strict initialization control
    if (!hasInitializedRef.current) {
      console.log('✅ First initialization, calling fetchHolidays');
      hasInitializedRef.current = true;
      fetchHolidays();
    } else {
      console.log('⚠️ Already initialized, skipping fetchHolidays call');
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
  }, [user?.id]); // Only depend on user ID to prevent unnecessary re-runs

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
  };
}