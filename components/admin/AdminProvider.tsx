'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AdminUser = { email: string; token: string };

type AdminCtx = {
  user: AdminUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const Ctx = createContext<AdminCtx | null>(null);
const KEY = 'mbp_admin_token';
const EMAIL_KEY = 'mbp_admin_email';

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(KEY);
    const email = localStorage.getItem(EMAIL_KEY) || '';
    if (token) setUser({ email, token });
  }, []);

  const value = useMemo<AdminCtx>(() => ({
    user,
    token: user?.token || null,
    async login(email, password) {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      const token = data.token || data.accessToken;
      localStorage.setItem(KEY, token);
      localStorage.setItem(EMAIL_KEY, email);
      setUser({ email, token });
    },
    logout() {
      localStorage.removeItem(KEY);
      localStorage.removeItem(EMAIL_KEY);
      setUser(null);
    },
    authFetch(path, init = {}) {
      const headers = new Headers(init.headers || {});
      const token = localStorage.getItem(KEY);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(path, { ...init, headers });
    },
  }), [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdmin outside provider');
  return ctx;
}
