import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { AUTH_INVALID_EVENT, api } from '@/services/api';
import { getCurrentUser, login as loginApi, logout as logoutApi } from '@/services/auth';
import { type Language, translate } from '@/lib/i18n';
import type { AuthUser, Project } from '@/api/types';

interface AppContextType {
  user: AuthUser | null;
  currentProject: Project | null;
  loading: boolean;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentProject: (project: Project | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(() => {
    try {
      const stored = localStorage.getItem('currentProject');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return stored === 'ru' || stored === 'uz' || stored === 'zh' || stored === 'tr' ? stored : 'en';
  });

  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      setUser(u);
      api.setToken(localStorage.getItem('token'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    function handleInvalidAuth() {
      setUser(null);
      setCurrentProjectState(null);
    }

    window.addEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
    return () => window.removeEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginApi(username, password);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    logoutApi();
    setUser(null);
    setCurrentProjectState(null);
    localStorage.removeItem('currentProject');
  }, []);

  const setCurrentProject = useCallback((project: Project | null) => {
    setCurrentProjectState(project);
    if (project) {
      localStorage.setItem('currentProject', JSON.stringify(project));
    } else {
      localStorage.removeItem('currentProject');
    }
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('language', nextLanguage);
  }, []);

  const t = useCallback((key: string) => translate(language, key), [language]);

  return (
    <AppContext.Provider value={{ user, currentProject, loading, language, setLanguage, t, login, logout, setCurrentProject }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
