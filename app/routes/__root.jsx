import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/tanstack-react-start';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import Layout from '../components/Layout';
import Login from '../components/Login';
import '../index.css';
import '../style.css';

import { createServerFn } from '@tanstack/react-start';

const fetchClerkPublishableKey = createServerFn({ method: 'GET' }).handler(async () => {
  let publishableKey = undefined;
  
  // 1. Try to get env from Vinxi context
  try {
    const { getEvent } = await import('vinxi/http');
    const event = getEvent();
    const env = event?.context?.cloudflare?.env || event?.context?.cloudflareEnv;
    publishableKey = env?.CLERK_PUBLISHABLE_KEY || env?.VITE_CLERK_PUBLISHABLE_KEY;
  } catch (e) {
    console.error("Vinxi getEvent env fetch failed:", e);
  }
  
  // 2. Fallback to global env
  if (!publishableKey) {
    const env = globalThis.MINIMAL_CLOUDFLARE_ENV || process.env;
    publishableKey = env?.CLERK_PUBLISHABLE_KEY || env?.VITE_CLERK_PUBLISHABLE_KEY;
  }
  
  return {
    clerkPublishableKey: publishableKey
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: false,
    },
  },
});

import SignUpPage from '../components/SignUp';

function RootComponent() {
  const { currentUser, loading } = useAuth();
  const { clerkPublishableKey } = Route.useRouteContext();
  const routerState = Route.useRouterState();
  const isSignUpPage = routerState.location.pathname === '/sign-up';

  let bodyContent;
  if (loading) {
    bodyContent = (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div className="loading-spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
      </div>
    );
  } else if (!currentUser) {
    bodyContent = isSignUpPage ? <SignUpPage /> : <Login />;
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
        <script dangerouslySetInnerHTML={{
          __html: `window.__CLERK_PUBLISHABLE_KEY = "${clerkPublishableKey || ''}";`
        }} />
        <HeadContent />
      </head>
      <body>
        {bodyContent}
        <Scripts />
      </body>
    </html>
  );
}

function AppWithProviders() {
  const { clerkPublishableKey } = Route.useRouteContext();
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
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
  beforeLoad: async () => {
    let publishableKey = undefined;
    if (typeof window !== 'undefined') {
      publishableKey = window.__CLERK_PUBLISHABLE_KEY;
    }
    
    if (!publishableKey) {
      const res = await fetchClerkPublishableKey();
      publishableKey = res.clerkPublishableKey;
    }
    
    return {
      clerkPublishableKey: publishableKey
    };
  },
  component: AppWithProviders,
});
