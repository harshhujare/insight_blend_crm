'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginCredentials, AuthResponse } from '@/types/auth';
import { api, setAuthToken, getAuthToken, setAuthErrorHandler } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const handleAuthError = useCallback(() => {
    setUser(null);
    setTokenState(null);
    setAuthToken(null);
  }, []);

  useEffect(() => {
    setAuthErrorHandler(handleAuthError);
  }, [handleAuthError]);

  // Session hydration on mount
  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const storedToken = getAuthToken();
      if (storedToken) {
        setTokenState(storedToken);
      }

      try {
        // Attempt to fetch current authenticated user profile
        const response = await api.get<{ user: User }>('/auth/me');
        if (isMounted && response?.user) {
          setUser(response.user);
        }
      } catch {
        // Unauthenticated or network error - clear state
        if (isMounted) {
          setUser(null);
          setTokenState(null);
          setAuthToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await api.post<AuthResponse>('/auth/login', credentials);
      if (data.user) {
        setUser(data.user);
      }
      if (data.token) {
        setTokenState(data.token);
        setAuthToken(data.token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout to guarantee client-side cleanup
    } finally {
      setUser(null);
      setTokenState(null);
      setAuthToken(null);
      setIsLoading(false);
      router.push('/login');
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
