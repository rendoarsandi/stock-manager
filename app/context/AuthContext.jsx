import React, { createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/tanstack-react-start';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  let clerkAuth = null;
  let clerkUser = null;
  let clerkError = null;

  try {
    clerkAuth = useClerkAuth();
  } catch (err) {
    clerkError = err;
    console.error("useClerkAuth error:", err);
  }

  try {
    clerkUser = useClerkUser();
  } catch (err) {
    clerkError = err;
    console.error("useClerkUser error:", err);
  }

  const isAuthLoaded = clerkAuth?.isLoaded;
  const isUserLoaded = clerkUser?.isLoaded;
  const userId = clerkAuth?.userId;
  const user = clerkUser?.user;

  const loading = !isAuthLoaded || !isUserLoaded;

  const currentUser = userId && user ? {
    id: userId,
    username: user.username || user.firstName || 'user',
    role: user.publicMetadata?.role || 'staff'
  } : null;

  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowDiagnostics(true);
      }, 4000);
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
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
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
