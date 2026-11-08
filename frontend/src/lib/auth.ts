'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserLogin, UserCreate, UserRole, TokenResponse } from './types';
import { authApi } from './api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: UserLogin) => Promise<void>;
  register: (userData: UserCreate) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT payload safely without external library
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize from localStorage on client-side mount
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined') return;

      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          // Optionally verify with server in the background
          try {
            const freshUser = await authApi.getMe();
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          } catch (apiErr) {
            console.warn('Failed to refresh user profile from server:', apiErr);
          }
        } catch {
          localStorage.removeItem('user');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthSuccess = (tokenData: TokenResponse) => {
    localStorage.setItem('access_token', tokenData.access_token);
    if (tokenData.refresh_token) {
      localStorage.setItem('refresh_token', tokenData.refresh_token);
    }

    let currentUser = tokenData.user;
    if (!currentUser) {
      // Decode user from JWT if not explicitly provided in response
      const payload = decodeJwtPayload(tokenData.access_token);
      if (payload) {
        currentUser = {
          id: (payload.sub as string) || '',
          email: (payload.email as string) || '',
          full_name: (payload.full_name as string) || (payload.email as string) || 'User',
          role: (payload.role as UserRole) || 'student',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    if (currentUser) {
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  };

  const login = async (credentials: UserLogin) => {
    setLoading(true);
    try {
      const tokenData = await authApi.login(credentials);
      handleAuthSuccess(tokenData);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: UserCreate) => {
    setLoading(true);
    try {
      const tokenData = await authApi.register(userData);
      if (tokenData && tokenData.access_token) {
        handleAuthSuccess(tokenData);
      } else {
        // Fallback to login if registration returns just user object
        await login({ email: userData.email, password: userData.password });
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const refreshUser = async () => {
    try {
      const freshUser = await authApi.getMe();
      setUser(freshUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(freshUser));
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const isAuthenticated = !!user;
  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
