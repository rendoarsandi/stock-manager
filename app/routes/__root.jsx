import { createRootRoute, Outlet, ScrollRestoration, HeadContent, Scripts } from '@tanstack/react-router';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/tanstack-react-start';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import Layout from '../components/Layout';
import Login from '../components/Login';
import '../index.css';
import '../style.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: false,
    },
  },
});

function RootComponent() {
  const { currentUser, loading } = useAuth();

  let bodyContent;
  if (loading) {
    bodyContent = (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div className="loading-spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
      </div>
    );
  } else if (!currentUser) {
    bodyContent = <Login />;
  } else {
    bodyContent = (
      <Layout>
        <Outlet />
      </Layout>
    );
  }

  const isSpaMode = typeof window !== 'undefined' && !!document.getElementById('root');

  if (isSpaMode) {
    return (
      <>
        {bodyContent}
        <ScrollRestoration />
        <Scripts />
      </>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/assets/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Stock Manager</title>
        <HeadContent />
      </head>
      <body>
        {bodyContent}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function AppWithProviders() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
            <RootComponent />
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export const Route = createRootRoute({
  component: AppWithProviders,
});
