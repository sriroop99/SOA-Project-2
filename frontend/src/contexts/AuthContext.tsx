import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  switchDemoAccount: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem('spendwise_user', JSON.stringify(profile));
        } catch {
          api.setToken(null);
          setUser(null);
          localStorage.removeItem('spendwise_user');
        }
      } else {
        const cached = localStorage.getItem('spendwise_user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {}
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      localStorage.setItem('spendwise_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
      localStorage.setItem('spendwise_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const switchDemoAccount = async (role: UserRole) => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      ADMIN: { email: 'admin@spendwise.corp', pass: 'Admin@12345' },
      FINANCE_MANAGER: { email: 'finance@spendwise.corp', pass: 'Finance@12345' },
      EMPLOYEE: { email: 'employee@spendwise.corp', pass: 'Employee@12345' },
    };

    const target = creds[role];
    await login(target.email, target.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchDemoAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
