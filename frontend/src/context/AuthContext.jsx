import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ems_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        setUser(userData);
        // Optionally verify token with backend
        authAPI.getMe()
          .then(response => {
            setUser({ ...userData, ...response.data });
          })
          .catch(() => {
            // Token invalid, clear storage
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
          })
          .finally(() => setLoading(false));
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const userData = {
        ...response.data,
        token: response.token
      };
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const user = {
        ...response.data,
        token: response.token
      };
      setUser(user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = {
        ...user,
        ...response.data
      };
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = useMemo(() => ({ 
    user, 
    login, 
    register, 
    logout, 
    updateProfile,
    loading 
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
