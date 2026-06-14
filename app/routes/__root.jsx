import { createRootRoute, Outlet, HeadContent, Scripts, useRouterState } from '@tanstack/react-router';
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
  
  // 1. Try global env first (e.g. Cloudflare Worker or Node.js environment)
  const globalEnv = globalThis.MINIMAL_CLOUDFLARE_ENV || (typeof process !== 'undefined' ? process.env : undefined);
  publishableKey = globalEnv?.CLERK_PUBLISHABLE_KEY || globalEnv?.VITE_CLERK_PUBLISHABLE_KEY;
  
  // 2. Try to get env from Vinxi context if not found globally
  if (!publishableKey) {
    try {
      const { getEvent } = await import('vinxi/http');
      const event = getEvent();
      const env = event?.context?.cloudflare?.env || event?.context?.cloudflareEnv;
      publishableKey = env?.CLERK_PUBLISHABLE_KEY || env?.VITE_CLERK_PUBLISHABLE_KEY;
    } catch (e) {
      if (e && e.message && !e.message.includes('vinxi/http')) {
        console.error("Vinxi getEvent env fetch failed:", e);
      }
    }
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
  const routerState = useRouterState();
  const isSignUpPage = routerState.location.pathname.startsWith('/sign-up');

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

let cachedPublishableKey = typeof window !== 'undefined' ? window.__CLERK_PUBLISHABLE_KEY : undefined;

export const Route = createRootRoute({
  beforeLoad: async () => {
    let publishableKey = undefined;
    
    if (typeof window === 'undefined') {
      // On the server, read directly from Cloudflare env bindings
      const env = globalThis.MINIMAL_CLOUDFLARE_ENV || process.env;
      publishableKey = env?.CLERK_PUBLISHABLE_KEY || env?.VITE_CLERK_PUBLISHABLE_KEY;
    } else {
      // On the client, check cache or window global
      publishableKey = cachedPublishableKey || window.__CLERK_PUBLISHABLE_KEY;
      
      if (!publishableKey) {
        // Fetch once and cache to prevent infinite request loops
        const res = await fetchClerkPublishableKey();
        publishableKey = res.clerkPublishableKey;
        cachedPublishableKey = publishableKey;
      }
    }
    
    return {
      clerkPublishableKey: publishableKey
    };
  },
  component: AppWithProviders,
});
