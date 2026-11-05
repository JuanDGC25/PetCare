import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, saveToken, setUnauthorizedHandler } from './api';
import type { User } from './types';

export interface RegisterData {
  name: string;
  document: string;
  phone: string;
  email: string;
  password: string;
  role: 'dueno' | 'proveedor';
  consent: boolean;
  businessName?: string;
  category?: string;
  locality?: string;
  neighborhood?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    setUser(await api<User>('/auth/me'));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) return;
    refresh()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout, refresh]);

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    logout,
    refresh,
    login: async (email, password, remember) => {
      const r = await api<{ token: string; user: User }>('/auth/login', 'POST', { email, password });
      saveToken(r.token, remember);
      setUser(r.user);
      return r.user;
    },
    register: async (data) => {
      const r = await api<{ token: string; user: User }>('/auth/register', 'POST', data);
      saveToken(r.token, true);
      setUser(r.user);
      return r.user;
    },
  }), [user, loading, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export const homeFor = (user: User | null) =>
  !user ? '/login' : user.role === 'proveedor' ? '/panel' : '/buscar';

export const staffLabel = (user: User | null) =>
  user?.category === 'veterinaria' ? 'Veterinarios' : 'Profesionales';
