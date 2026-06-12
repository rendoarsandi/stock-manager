import React from 'react';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Import from './pages/Import';
import Review from './pages/Review';
import StockHistory from './pages/StockHistory';
import Opname from './pages/Opname';
import Settings from './pages/Settings';

// Root route component
function RootComponent() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: Products,
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: Import,
});

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  component: Review,
});

const stockHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/stock-history',
  component: StockHistory,
});

const opnameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/opname',
  component: Opname,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  productsRoute,
  importRoute,
  reviewRoute,
  stockHistoryRoute,
  opnameRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});
