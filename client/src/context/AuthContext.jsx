import { createContext, useContext, useState, useEffect } from 'react';
import { getStoredAuth, setStoredAuth, clearStoredAuth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.user && stored?.token) setUser(stored.user);
    setLoading(false);
  }, []);

  const login = (data) => {
    setStoredAuth(data);
    setUser(data.user);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
