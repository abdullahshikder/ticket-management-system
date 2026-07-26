import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { issueService } from '../services/issueService';

interface IssueUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  team: string;
  role: 'reporter' | 'internal' | 'admin';
}

interface IssueAuthContextValue {
  user: IssueUser | null;
  isAuthenticated: boolean;
  isInternal: boolean;
  isAdmin: boolean;
  login: (email: string, name?: string) => Promise<IssueUser>;
  loginAs: (user: IssueUser) => void;
  logout: () => void;
  updateUser: (updates: Partial<IssueUser>) => void;
}

const IssueAuthContext = createContext<IssueAuthContextValue | null>(null);

function generateId(): string {
  return 'usr_' + Math.random().toString(36).substring(2, 14);
}

export function IssueAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IssueUser | null>(() => {
    const stored = localStorage.getItem('issue_user');
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('issue_user', JSON.stringify(user));
      localStorage.setItem('issue_user_id', user.id);
      localStorage.setItem('issue_user_role', user.role);
    } else {
      localStorage.removeItem('issue_user');
      localStorage.removeItem('issue_user_id');
      localStorage.removeItem('issue_user_role');
    }
  }, [user]);

  const login = useCallback(async (email: string, name?: string): Promise<IssueUser> => {
    try {
      const res = await issueService.login(email, name);
      const u = res.user;
      const issueUser: IssueUser = {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone || '',
        team: u.team || '',
        role: u.role as IssueUser['role'],
      };
      setUser(issueUser);
      return issueUser;
    } catch {
      const fallback: IssueUser = {
        id: generateId(),
        full_name: name || email.split('@')[0],
        email,
        phone: '',
        team: '',
        role: 'reporter',
      };
      setUser(fallback);
      return fallback;
    }
  }, []);

  const loginAs = useCallback((u: IssueUser) => {
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<IssueUser>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const value: IssueAuthContextValue = {
    user,
    isAuthenticated: !!user,
    isInternal: user?.role === 'internal' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
    login,
    loginAs,
    logout,
    updateUser,
  };

  return (
    <IssueAuthContext.Provider value={value}>
      {children}
    </IssueAuthContext.Provider>
  );
}

export function useIssueAuth() {
  const ctx = useContext(IssueAuthContext);
  if (!ctx) throw new Error('useIssueAuth must be used within IssueAuthProvider');
  return ctx;
}
