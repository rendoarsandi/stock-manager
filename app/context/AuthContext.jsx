import React, { createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/tanstack-react-start';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();
  const clerkError = null;

  const isAuthLoaded = clerkAuth?.isLoaded;
  const isUserLoaded = clerkUser?.isLoaded;
  const userId = clerkAuth?.userId;
  const user = clerkUser?.user;

  const [localUser, setLocalUser] = React.useState(null);
  const [needsRegistration, setNeedsRegistration] = React.useState(false);
  const [localLoading, setLocalLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input?.url || '');
      let isLocalApi = false;
      try {
        const parsedUrl = new URL(urlStr, window.location.origin);
        isLocalApi = parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith('/api/');
      } catch (e) {}

      if (isLocalApi && !urlStr.includes('/api/auth/clerk-webhook')) {
        try {
          if (clerkAuth && typeof clerkAuth.getToken === 'function') {
            const token = await clerkAuth.getToken();
            if (token) {
              init = init || {};
              let headers = init.headers;
              if (!headers) {
                headers = {};
              }
              if (headers instanceof Headers) {
                if (!headers.has('Authorization')) {
                  headers.set('Authorization', `Bearer ${token}`);
                }
              } else if (Array.isArray(headers)) {
                const hasAuth = headers.some(([k]) => k.toLowerCase() === 'authorization');
                if (!hasAuth) {
                  headers.push(['Authorization', `Bearer ${token}`]);
                }
              } else {
                const hasAuth = Object.keys(headers).some(k => k.toLowerCase() === 'authorization');
                if (!hasAuth) {
                  headers['Authorization'] = `Bearer ${token}`;
                }
              }
              init.headers = headers;
            }
          }
        } catch (e) {
          console.error("Failed to append Clerk token to fetch:", e);
        }
      }
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [clerkAuth]);

  React.useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) {
      return;
    }

    if (!userId) {
      setLocalUser(null);
      setNeedsRegistration(false);
      setLocalLoading(false);
      return;
    }

    let isMounted = true;
    setLocalLoading(true);

    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        if (data.needsRegistration) {
          setNeedsRegistration(true);
          setLocalUser(null);
        } else {
          setLocalUser({
            id: data.id,
            username: data.username,
            role: data.role
          });
          setNeedsRegistration(false);
        }
        setLocalLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        if (err.message !== 'Unauthorized') {
          console.error("Auth fetch failed:", err);
        }
        setLocalUser(null);
        setNeedsRegistration(true);
        setLocalLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoaded, isUserLoaded, userId]);

  const registerLocalUser = async (username) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      setLocalUser({
        id: data.id,
        username: data.username,
        role: data.role
      });
      setNeedsRegistration(false);
      return { success: true };
    } catch (err) {
      console.error("Local registration failed:", err);
      return { success: false, message: err.message };
    }
  };

  const loading = !isAuthLoaded || !isUserLoaded || localLoading;

  const currentUser = localUser;

  const clerkDetails = user ? {
    username: user.username || '',
    firstName: user.firstName || '',
    lastName: user.lastName || ''
  } : null;

  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowDiagnostics(true);
      }, 25000);
      return () => clearTimeout(timer);
    } else {
      setShowDiagnostics(false);
    }
  }, [loading]);

  const logout = async () => {
    try {
      await clerkAuth?.signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const login = async () => {
    // Login is handled by Clerk prebuilt component
  };

  if (clerkError || (showDiagnostics && loading)) {
    return (
      <div style={{ padding: '24px', background: '#1e1e2e', color: '#cdd6f4', fontFamily: 'monospace', minHeight: '100vh', boxSizing: 'border-box' }}>
        <h2 style={{ color: '#f38ba8' }}>Diagnostic & Error Panel</h2>
        {clerkError && (
          <div style={{ marginBottom: '20px', padding: '16px', background: '#313244', borderRadius: '6px' }}>
            <h3 style={{ color: '#f38ba8', marginTop: 0 }}>Clerk Hook Error:</h3>
            <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{clerkError.stack || clerkError.message || String(clerkError)}</pre>
          </div>
        )}
        <div style={{ padding: '16px', background: '#313244', borderRadius: '6px', marginBottom: '20px' }}>
          <h3 style={{ color: '#a6e3a1', marginTop: 0 }}>Debug Information:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>VITE_CLERK_PUBLISHABLE_KEY:</strong> {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'undefined/empty'}</li>
            <li><strong>window.__CLERK_PUBLISHABLE_KEY:</strong> {typeof window !== 'undefined' ? (window.__CLERK_PUBLISHABLE_KEY || 'undefined/empty') : 'SSR'}</li>
            <li><strong>Clerk Auth Loaded:</strong> {String(isAuthLoaded)}</li>
            <li><strong>Clerk User Loaded:</strong> {String(isUserLoaded)}</li>
            <li><strong>Clerk User ID:</strong> {String(userId)}</li>
            <li><strong>Window URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'SSR'}</li>
            <li><strong>Cookie present:</strong> {typeof document !== 'undefined' ? String(document.cookie.includes('__client') || document.cookie.includes('token')) : 'SSR'}</li>
          </ul>
        </div>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#f38ba8', color: '#11111b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reload Page</button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout, needsRegistration, clerkDetails, registerLocalUser }}>
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
