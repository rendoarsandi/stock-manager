import React, { createContext, useContext } from 'react';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
});

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setLocalUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setLocalUser(data);
        } else {
          if (isMounted) setLocalUser(null);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const data = await res.json();
    if (res.status === 403 && (data.requires_password_reset || data.requiresPasswordReset)) {
      return { success: false, requiresPasswordReset: true, username: data.username };
    }
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }
    setLocalUser({ id: data.id, username: data.username, role: data.role });
    return { success: true };
  };

  const signup = async (email, username, password) => {
    const res = await authClient.signUp.email({
      email,
      password,
      name: username,
      username,
      role: 'staff' // Default role
    });
    if (res.error) {
      throw new Error(res.error.message || 'Signup failed');
    }
    // Fetch user info
    const meRes = await fetch('/api/auth/me');
    if (meRes.ok) {
      const data = await meRes.json();
      setLocalUser(data);
    }
    return { success: true };
  };

  const logout = async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("SignOut failed:", e);
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setLocalUser(null);
  };

  const resetPassword = async (username, password) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Password reset failed');
    }
    setLocalUser({ id: data.id, username: data.username, role: data.role });
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout, signup, resetPassword }}>
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
