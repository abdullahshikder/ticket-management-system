import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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
  login: (email: string, name?: string) => IssueUser;
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
    const demoUser: IssueUser = {
      id: generateId(),
      full_name: 'Demo Reporter',
      email: 'reporter@pathao.com',
      phone: '',
      team: 'Merchant Operations',
      role: 'reporter',
    };
    localStorage.setItem('issue_user', JSON.stringify(demoUser));
    localStorage.setItem('issue_user_id', demoUser.id);
    localStorage.setItem('issue_user_role', demoUser.role);
    return demoUser;
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

  const login = useCallback((email: string, name?: string): IssueUser => {
    const newUser: IssueUser = {
      id: generateId(),
      full_name: name || email.split('@')[0],
      email,
      phone: '',
      team: '',
      role: 'reporter',
    };
    setUser(newUser);
    return newUser;
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
