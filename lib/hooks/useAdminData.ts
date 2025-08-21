'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// Types for admin data structures
export interface Employee {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'admin' | 'employee';
  department?: string;
  departmentName?: string;
  holidayAllowance: number;
  holidaysUsed: number;
  holidaysRemaining: number;
  createdAt: string;
  lastLogin?: string;
}

export interface Department {
  id: string;
  name: string;
  location?: string;
  managerId?: string;
  managerName?: string;
  employeeCount: number;
  createdAt: string;
}

export interface PendingHolidayRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department?: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  type: 'vacation' | 'sick' | 'personal';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  // Medical certificate fields for sick leave
  medicalCertificateOption?: 'upload' | 'send_later';
  medicalCertificateFileName?: string;
  medicalCertificateFileId?: string;
  medicalCertificateStatus?: 'pending' | 'uploaded' | 'commitment_pending';
}

export interface SystemSettings {
  'holidays.visibility_mode': 'all_see_all' | 'admin_only' | 'department_only';
  'holidays.approval_mode': 'manual' | 'auto';
  'holidays.show_names': boolean;
  'holidays.show_details': boolean;
  'holidays.advance_notice_days': number;
  'holidays.max_consecutive_days': number;
  'system.registration_enabled': boolean;
  'system.domain_restriction_enabled': boolean;
  'system.default_holiday_allowance': number;
  'notifications.email_enabled': boolean;
  'notifications.browser_enabled': boolean;
  'notifications.remind_managers': boolean;
  'departments.visibility_enabled': boolean;
  'departments.cross_department_view': boolean;
}

export interface AdminStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingEmployees: number;
  pendingHolidayRequests: number;
  totalHolidayRequests: number;
  holidaysThisMonth: number;
  employeesOnHolidayToday: number;
  departmentCount: number;
}

// Helper function for consistent fetch configuration
const createFetchConfig = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', token?: string, body?: any) => {
  // Multiple checks for development mode
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3001';

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    // Include credentials only in production where cookies work properly
    ...(isDevelopment ? {} : { credentials: 'include' }),
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  return config;
};

// Helper function for consistent base URL
const getBaseUrl = () => {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3001';
  
  return isDevelopment ? 'http://localhost:3000' : window.location.origin;
};

export function useAdminData() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for different data types
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allRequests, setAllRequests] = useState<PendingHolidayRequest[]>([]);
  const [systemSettings, setSystemSettings] = useState<Partial<SystemSettings>>({});
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  // Fetch all employees
  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/get-employees`, createFetchConfig('GET', token || undefined));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch employees');
      }

      if (data.success && data.data) {
        setEmployees(data.data.employees || data.data || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch all departments
  const fetchDepartments = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/get-departments`, createFetchConfig('GET', token || undefined));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch departments');
      }

      if (data.success && data.data) {
        setDepartments(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch all holiday requests
  const fetchAllRequests = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays?viewMode=all`, createFetchConfig('GET', token || undefined));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch holiday requests');
      }

      if (data.success && data.data) {
        setAllRequests(data.data.holidays || data.data || []);
      }
    } catch (err) {
      console.error('Error fetching holiday requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holiday requests');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch system settings
  const fetchSystemSettings = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/get-settings`, createFetchConfig('GET', token || undefined));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch system settings');
      }

      if (data.success) {
        const rawSettings = data.settings || data.data || {};
        
        // Convert string values to appropriate types
        const convertedSettings = { ...rawSettings };
        
        // Boolean settings that need conversion
        const booleanSettings = [
          'holidays.show_names',
          'holidays.show_details',
          'system.registration_enabled',
          'system.domain_restriction_enabled',
          'notifications.email_enabled',
          'notifications.browser_enabled',
          'notifications.remind_managers',
          'departments.visibility_enabled',
          'departments.cross_department_view'
        ];
        
        // Convert string values to booleans
        booleanSettings.forEach(key => {
          if (convertedSettings[key] !== undefined) {
            convertedSettings[key] = convertedSettings[key] === 'true';
          }
        });
        
        // Number settings that need conversion
        const numberSettings = [
          'holidays.advance_notice_days',
          'holidays.max_consecutive_days', 
          'system.default_holiday_allowance'
        ];
        
        // Convert string values to numbers
        numberSettings.forEach(key => {
          if (convertedSettings[key] !== undefined) {
            convertedSettings[key] = Number(convertedSettings[key]);
          }
        });
        
        console.log('Converted settings:', convertedSettings);
        setSystemSettings(convertedSettings);
      }
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system settings');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Calculate admin statistics
  const calculateStats = useCallback(() => {
    if (!employees.length) return;

    const activeEmployees = employees.filter(emp => emp.status === 'active').length;
    const pendingEmployees = employees.filter(emp => emp.status === 'pending').length;
    const totalHolidaysUsed = employees.reduce((sum, emp) => sum + emp.holidaysUsed, 0);
    const pendingHolidayRequests = allRequests.filter(req => req.status === 'pending').length;

    setAdminStats({
      totalEmployees: employees.length,
      activeEmployees,
      pendingEmployees,
      pendingHolidayRequests: pendingHolidayRequests,
      totalHolidayRequests: allRequests.length, // Total of all requests
      holidaysThisMonth: totalHolidaysUsed, // Placeholder - would need date filtering
      employeesOnHolidayToday: 0, // Placeholder - would need real-time data
      departmentCount: departments.length,
    });
  }, [employees, allRequests, departments]);

  // Action functions
  const approveEmployee = useCallback(async (employeeId: string) => {
    if (!isAdmin) return false;

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/admin-approve-employee`, 
        createFetchConfig('POST', token || undefined, {
          employeeId: employeeId,
          action: 'approve'
        }));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve employee');
      }

      // Refresh employees data
      await fetchEmployees();
      return true;
    } catch (err) {
      console.error('Error approving employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve employee');
      return false;
    }
  }, [isAdmin, fetchEmployees]);

  const rejectEmployee = useCallback(async (employeeId: string) => {
    if (!isAdmin) return false;

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/admin-approve-employee`, 
        createFetchConfig('POST', token || undefined, {
          employeeId: employeeId,
          action: 'reject'
        }));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject employee');
      }

      // Refresh employees data
      await fetchEmployees();
      return true;
    } catch (err) {
      console.error('Error rejecting employee:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject employee');
      return false;
    }
  }, [isAdmin, fetchEmployees]);

  const approveHolidayRequest = useCallback(async (requestId: string) => {
    if (!isAdmin) return false;

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/update-holiday-status`, 
        createFetchConfig('POST', token || undefined, {
          holidayId: requestId,
          action: 'approve'
        }));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve holiday request');
      }

      // Refresh all requests
      await fetchAllRequests();
      return true;
    } catch (err) {
      console.error('Error approving holiday request:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve holiday request');
      return false;
    }
  }, [isAdmin, fetchAllRequests]);

  const rejectHolidayRequest = useCallback(async (requestId: string, reason?: string) => {
    if (!isAdmin) return false;

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/update-holiday-status`, 
        createFetchConfig('POST', token || undefined, {
          holidayId: requestId,
          action: 'reject',
          notes: reason
        }));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject holiday request');
      }

      // Refresh all requests
      await fetchAllRequests();
      return true;
    } catch (err) {
      console.error('Error rejecting holiday request:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject holiday request');
      return false;
    }
  }, [isAdmin, fetchAllRequests]);

  const updateSystemSetting = useCallback(async (key: keyof SystemSettings, value: any) => {
    if (!isAdmin) return false;

    try {
      const baseUrl = getBaseUrl();
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/update-settings-simple`, 
        createFetchConfig('POST', token || undefined, {
          key: key,
          value: value
        }));

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update setting');
      }

      // Update local settings
      setSystemSettings(prev => ({
        ...prev,
        [key]: value
      }));

      return true;
    } catch (err) {
      console.error('Error updating setting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      return false;
    }
  }, [isAdmin]);

  // Fetch all admin data
  const fetchAllAdminData = useCallback(async () => {
    if (!isAdmin) return;

    await Promise.all([
      fetchEmployees(),
      fetchDepartments(),
      fetchAllRequests(),
      fetchSystemSettings()
    ]);
  }, [isAdmin, fetchEmployees, fetchDepartments, fetchAllRequests, fetchSystemSettings]);

  // Calculate stats when data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Initial data fetch
  useEffect(() => {
    if (isAdmin && user) {
      fetchAllAdminData();
    }
  }, [isAdmin, user, fetchAllAdminData]);

  return {
    // Data
    employees,
    departments,
    pendingRequests: allRequests, // Export allRequests as pendingRequests for compatibility
    systemSettings,
    adminStats,
    
    // State
    loading,
    error,
    
    // Actions
    fetchAllAdminData,
    fetchEmployees,
    fetchDepartments,
    fetchPendingRequests: fetchAllRequests, // Export fetchAllRequests as fetchPendingRequests for compatibility
    fetchSystemSettings,
    approveEmployee,
    rejectEmployee,
    approveHolidayRequest,
    rejectHolidayRequest,
    updateSystemSetting,
    
    // Utilities
    clearError: () => setError(null),
  };
}