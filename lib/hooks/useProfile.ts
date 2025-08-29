'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  departmentId?: string;
  departmentName?: string;
  holidayAllowance: number;
  phone?: string;
  avatarUrl?: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseProfileResult {
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch fresh profile data from server
  const refreshProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin;

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}/.netlify/functions/get-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          setProfile(result.user);
          return;
        }
      }
      
      // Fallback to user context data if API call fails
      if (user) {
        setProfile({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          departmentId: user.departmentId,
          departmentName: user.departmentName,
          holidayAllowance: user.holidayAllowance || 0,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          jobTitle: user.jobTitle,
          createdAt: (user as any).createdAt || new Date().toISOString(),
          updatedAt: (user as any).updatedAt || new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setError('Errore nel caricamento del profilo');
      
      // Fallback to user context data
      if (user) {
        setProfile({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          departmentId: user.departmentId,
          departmentName: user.departmentName,
          holidayAllowance: user.holidayAllowance || 0,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          jobTitle: user.jobTitle,
          createdAt: (user as any).createdAt || new Date().toISOString(),
          updatedAt: (user as any).updatedAt || new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize profile data when user changes or component mounts
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user?.id]); // Only refresh when user ID changes (login/logout)

  // Auto-refresh profile data periodically (every 30 seconds) when page is visible
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        refreshProfile();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [user?.id]);

  // Refresh profile when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id]);

  return {
    profile,
    loading,
    error,
    refreshProfile
  };
}