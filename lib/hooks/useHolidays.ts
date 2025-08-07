'use client';

import { useState, useEffect, useCallback } from 'react';
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
  workingDays: number;
  createdAt: string;
  // User info if populated (for backward compatibility)
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface HolidayStats {
  totalAllowance: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
  upcomingHolidays: number;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
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

  const getBaseUrl = () => {
    return process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8888' 
      : window.location.origin;
  };

  const fetchHolidays = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build query parameters (adjusted for mock API)
      const params = new URLSearchParams();
      if (options.viewMode) params.append('viewMode', options.viewMode); // Changed from view_mode
      if (options.status) params.append('status', options.status);
      if (options.year) params.append('year', options.year.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());

      const response = await fetch(
        `${getBaseUrl()}/.netlify/functions/get-holidays-mock?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch holidays');
      }

      if (data.success) {
        setHolidays(data.data.holidays || []);
        
        // Calculate stats from the fetched data
        const holidayData = data.data.holidays || [];
        const currentYear = new Date().getFullYear();
        
        // Filter holidays for current year
        const currentYearHolidays = holidayData.filter((holiday: Holiday) => {
          const startDate = new Date(holiday.startDate);
          return startDate.getFullYear() === currentYear;
        });

        // Calculate statistics
        const usedDays = currentYearHolidays
          .filter((h: Holiday) => h.status === 'approved' && h.type === 'vacation')
          .reduce((sum: number, h: Holiday) => sum + h.workingDays, 0);

        const pendingDays = currentYearHolidays
          .filter((h: Holiday) => h.status === 'pending' && h.type === 'vacation')
          .reduce((sum: number, h: Holiday) => sum + h.workingDays, 0);

        const totalAllowance = 20; // Default allowance, should come from user profile
        const remainingDays = totalAllowance - usedDays;

        const upcomingHolidays = currentYearHolidays.filter((h: Holiday) => {
          const startDate = new Date(h.startDate);
          const today = new Date();
          return h.status === 'approved' && startDate > today;
        }).length;

        const totalRequests = currentYearHolidays.length;
        const approvedRequests = currentYearHolidays.filter((h: Holiday) => h.status === 'approved').length;
        const pendingRequests = currentYearHolidays.filter((h: Holiday) => h.status === 'pending').length;
        const rejectedRequests = currentYearHolidays.filter((h: Holiday) => h.status === 'rejected').length;

        const calculatedStats: HolidayStats = {
          totalAllowance,
          usedDays,
          remainingDays,
          pendingDays,
          upcomingHolidays,
          totalRequests,
          approvedRequests,
          pendingRequests,
          rejectedRequests,
        };

        setStats(calculatedStats);
      }
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  }, [user, options.viewMode, options.status, options.year, options.limit, options.offset]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const refreshHolidays = useCallback(() => {
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