'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive' | 'pending';
  department?: string;
  departmentName?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });
  const router = useRouter();

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('userData');
    
    console.log('🔍 Auth check on mount:', { token: !!token, userData: !!userData });
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        console.log('✅ Restoring user session:', user);
        setAuthState({
          user,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userData');
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } else {
      console.log('⚠️ No valid session found');
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Use Netlify dev server in development, production URL in production
      // Multiple checks for development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3001';
      
      const baseUrl = isDevelopment 
        ? 'http://localhost:3000' 
        : window.location.origin;
      
      console.log('🔧 Login attempt:', {
        NODE_ENV: process.env.NODE_ENV,
        hostname: window.location.hostname,
        port: window.location.port,
        isDevelopment,
        baseUrl,
        fullUrl: `${baseUrl}/.netlify/functions/login-test`
      });
      
      const response = await fetch(`${baseUrl}/.netlify/functions/login-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include credentials only in production where cookies work properly
        ...(isDevelopment ? {} : { credentials: 'include' }),
        body: JSON.stringify({ email, password }),
      });

      console.log('🔧 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const data = await response.json();
      console.log('🔧 Response data:', data);

      if (response.ok && data.success) {
        const { user, accessToken } = data.data;
        
        console.log('✅ Login successful:', user);
        
        // Store token and user data
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('userData', JSON.stringify(user));
        
        // Update auth state
        setAuthState({
          user,
          loading: false,
          error: null
        });

        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Errore durante il login'
        }));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Errore di connessione'
      }));
      return false;
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out user');
    
    try {
      // Call logout endpoint to clear cookies
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin;
        
      await fetch(`${baseUrl}/.netlify/functions/logout`, {
        method: 'POST',
        credentials: 'include' // Include cookies
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    
    // Update auth state
    setAuthState({
      user: null,
      loading: false,
      error: null
    });
    
    // Redirect to login
    router.push('/it/login');
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      // Use the same baseUrl logic as login
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3001';
      
      const baseUrl = isDevelopment 
        ? 'http://localhost:3000' 
        : window.location.origin;

      // Call a profile endpoint to get updated user data
      const response = await fetch(`${baseUrl}/.netlify/functions/get-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const updatedUser = data.data.user;
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          setAuthState(prev => ({
            ...prev,
            user: updatedUser
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    login,
    logout,
    clearError,
    refreshUserData,
    isAuthenticated: !!authState.user,
    isAdmin: authState.user?.role === 'admin'
  };
}