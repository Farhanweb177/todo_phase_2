'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthState, RegisterRequest, LoginRequest } from '@/utils/types';
import { getErrorMessage } from '@/utils/types';
import { loginUser as apiLoginUser, registerUser as apiRegisterUser, getCurrentUser } from '@/services/auth';
import { getAccessToken, setAccessToken, setRefreshToken, clearAuthStorage } from '@/utils/storage';

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Check if user is authenticated
  const checkAuth = async (): Promise<void> => {
    // Skip the API call entirely when there is no token — avoids a
    // guaranteed 401 response and the associated console noise.
    const token = getAccessToken();
    if (!token) {
      setState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const user = await getCurrentUser();

      setState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });
    } catch {
      setState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null, // Don't show error on initial auth check failure
      });
    }
  };

  // Login action
  const login = async (data: LoginRequest): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await apiLoginUser(data);

      // Store tokens
      setAccessToken(response.accessToken);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }

      // Get user info
      const user = await getCurrentUser();

      setState({
        isAuthenticated: true,
        user,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error, 'Login failed'),
      }));
      throw error;
    }
  };

  // Register action
  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await apiRegisterUser(data);

      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error, 'Registration failed'),
      }));
      throw error;
    }
  };

  // Logout action
  const logout = (): void => {
    clearAuthStorage();

    setState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });

    router.push('/auth/signin');
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
