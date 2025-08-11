'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive' | 'pending';
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
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8888' 
        : window.location.origin;
      
      const response = await fetch(`${baseUrl}/.netlify/functions/login-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

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
        ? 'http://localhost:8888' 
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

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    login,
    logout,
    clearError,
    isAuthenticated: !!authState.user,
    isAdmin: authState.user?.role === 'admin'
  };
}