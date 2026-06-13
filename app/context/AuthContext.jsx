import React, { createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/tanstack-react-start';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { userId, isLoaded: isAuthLoaded, signOut } = useClerkAuth();
  const { user, isLoaded: isUserLoaded } = useClerkUser();

  const loading = !isAuthLoaded || !isUserLoaded;

  const currentUser = userId && user ? {
    id: userId,
    username: user.username || user.firstName || 'user',
    role: user.publicMetadata?.role || 'staff'
  } : null;

  const logout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const login = async () => {
    // Login is handled by Clerk prebuilt component
  };

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
