'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface SystemSettings {
  'holidays.visibility_mode': 'all_see_all' | 'admin_only' | 'department_only';
  'holidays.show_names': boolean;
  'holidays.show_details': boolean;
}

export function useSystemSettings() {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<Partial<SystemSettings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemSettings = useCallback(async () => {
    if (!isAuthenticated) {
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

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/get-settings-mock`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings || data.data || {});
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch system settings');
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Effect to fetch settings on mount
  useEffect(() => {
    fetchSystemSettings();
  }, [fetchSystemSettings]);

  // Convenience functions to get specific settings with defaults
  const getVisibilityMode = () => {
    return settings['holidays.visibility_mode'] || 'admin_only';
  };

  const canSeeAllHolidays = () => {
    return getVisibilityMode() === 'all_see_all';
  };

  const canSeeDepartmentHolidays = () => {
    const mode = getVisibilityMode();
    return mode === 'all_see_all' || mode === 'department_only';
  };

  const showNames = () => {
    return settings['holidays.show_names'] ?? true;
  };

  const showDetails = () => {
    return settings['holidays.show_details'] ?? true;
  };

  return {
    settings,
    loading,
    error,
    fetchSystemSettings,
    // Convenience functions
    getVisibilityMode,
    canSeeAllHolidays,
    canSeeDepartmentHolidays,
    showNames,
    showDetails
  };
}