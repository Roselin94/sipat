import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { apiClient } from '../api/client';

export interface UserProfile {
  id: string;
  matricule: string;
  email: string;
  firstName: string;
  lastName: string;
  functionTitle: string;
  organization: {
    id: string;
    code: string;
    name: string;
    shortName: string;
    type: string;
  };
  territorialScope: 'NATIONAL' | 'DEPARTMENT' | 'COMMUNE_DISTRICT' | 'LOCALITY';
  department?: { id: string; code: string; name: string } | null;
  roles: string[];
  permissions: string[];
}

interface CachedUserProfile {
  user: UserProfile;
  savedAt: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isOfflineSession: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OFFLINE_PROFILE_KEY = 'sipat_offline_profile';
const OFFLINE_PROFILE_MAX_AGE = 72 * 60 * 60 * 1000;

const isUserProfile = (value: unknown): value is UserProfile => {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<UserProfile>;
  return (
    typeof profile.id === 'string' &&
    typeof profile.firstName === 'string' &&
    typeof profile.lastName === 'string' &&
    Array.isArray(profile.roles) &&
    Array.isArray(profile.permissions) &&
    !!profile.organization &&
    typeof profile.organization.shortName === 'string'
  );
};

const readCachedProfile = (): UserProfile | null => {
  const cached = localStorage.getItem(OFFLINE_PROFILE_KEY);
  if (!cached) return null;

  try {
    const parsed: unknown = JSON.parse(cached);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('savedAt' in parsed) ||
      typeof parsed.savedAt !== 'number' ||
      !('user' in parsed) ||
      !isUserProfile(parsed.user) ||
      Date.now() - parsed.savedAt > OFFLINE_PROFILE_MAX_AGE
    ) {
      localStorage.removeItem(OFFLINE_PROFILE_KEY);
      return null;
    }

    return parsed.user;
  } catch (error) {
    console.warn('Le profil local SIPAT est illisible et a été supprimé.', error);
    localStorage.removeItem(OFFLINE_PROFILE_KEY);
    return null;
  }
};

const cacheProfile = (profile: UserProfile) => {
  localStorage.setItem(
    OFFLINE_PROFILE_KEY,
    JSON.stringify({ user: profile, savedAt: Date.now() } satisfies CachedUserProfile)
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const isOfflineSessionRef = useRef(false);
  const userRef = useRef<UserProfile | null>(null);
  userRef.current = user;
  const updateOfflineSession = (offline: boolean) => {
    isOfflineSessionRef.current = offline;
    setIsOfflineSession(offline);
  };

  useEffect(() => {
    let isActive = true;

    const fetchProfile = async () => {
      const token = localStorage.getItem('sipat_access_token');
      if (!token) {
        if (isActive) setIsLoading(false);
        return;
      }

      if (!navigator.onLine) {
        const cachedProfile = readCachedProfile();
        if (isActive && cachedProfile) {
          setUser(cachedProfile);
          updateOfflineSession(true);
        }
        if (isActive) setIsLoading(false);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        if (isActive) {
          setUser(res.data.data);
          cacheProfile(res.data.data);
          updateOfflineSession(false);
        }
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          (!error.response || error.response.status >= 500)
        ) {
          const cachedProfile = readCachedProfile();
          if (isActive && cachedProfile) {
            setUser(cachedProfile);
            updateOfflineSession(true);
          }
        } else if (isActive) {
          localStorage.removeItem('sipat_access_token');
          localStorage.removeItem('sipat_refresh_token');
          localStorage.removeItem(OFFLINE_PROFILE_KEY);
          setUser(null);
          updateOfflineSession(false);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    const handleOffline = () => {
      const cachedProfile = readCachedProfile();
      const currentUser = cachedProfile || userRef.current;
      if (currentUser) {
        setUser(currentUser);
        updateOfflineSession(true);
      }
    };

    const handleOnline = async () => {
      if (!isOfflineSessionRef.current) return;
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data.data);
        cacheProfile(res.data.data);
        updateOfflineSession(false);
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          (!error.response || error.response.status >= 500)
        ) {
          return;
        }
        localStorage.removeItem('sipat_access_token');
        localStorage.removeItem('sipat_refresh_token');
        localStorage.removeItem(OFFLINE_PROFILE_KEY);
        setUser(null);
        updateOfflineSession(false);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    void fetchProfile();

    return () => {
      isActive = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await apiClient.post('/auth/login', { identifier, password });
    const { tokens, user: userData } = res.data.data;
    localStorage.setItem('sipat_access_token', tokens.accessToken);
    localStorage.setItem('sipat_refresh_token', tokens.refreshToken);
    setUser(userData);
    cacheProfile(userData);
    updateOfflineSession(false);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('sipat_refresh_token');
      if (refreshToken && !isOfflineSession) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } finally {
      localStorage.removeItem('sipat_access_token');
      localStorage.removeItem('sipat_refresh_token');
      localStorage.removeItem(OFFLINE_PROFILE_KEY);
      setUser(null);
      updateOfflineSession(false);
      window.location.href = '/login';
    }
  };

  const hasRole = (role: string) => {
    if (!user) return false;
    return user.roles.includes('SUPER_ADMIN') || user.roles.includes(role);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    return user.roles.includes('SUPER_ADMIN') || user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isOfflineSession, login, logout, hasRole, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
