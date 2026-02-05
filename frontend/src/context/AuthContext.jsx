import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ems_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (err) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = (payload) => {
    setUser(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

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
