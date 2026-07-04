import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setLocalUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 401) {
        setLocalUser(null);
      } else if (res.ok) {
        const data = await res.json();
        setLocalUser({
          id: data.id,
          username: data.username,
          role: data.role
        });
      } else {
        setLocalUser(null);
      }
    } catch (err) {
      console.error("Auth session fetch failed:", err);
      setLocalUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-in/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Invalid username or password');
      }
      document.cookie = "logged_out=; path=/; max-age=0";
      await fetchSession();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/sign-up/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name: username })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      document.cookie = "logged_out=; path=/; max-age=0";
      await fetchSession();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' }).catch(() => {});
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      document.cookie = "logged_out=true; path=/; max-age=31536000";
      setLocalUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
