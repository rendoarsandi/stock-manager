import { storageContext } from './db/context.js';
import { seedIfNeeded } from './db/connection.js';
import { getLocalStore } from './db/local_sqlite.js';
import { BadRequestError } from './routes_new/index.js';

import { Route as healthRoute } from '../app/routes/api/health.js';
import { Route as loginRoute } from '../app/routes/api/auth/login.js';
import { Route as logoutRoute } from '../app/routes/api/auth/logout.js';
import { Route as meRoute } from '../app/routes/api/auth/me.js';
import { Route as usersRoute } from '../app/routes/api/auth/users.js';
import { Route as clerkWebhookRoute } from '../app/routes/api/auth/clerk-webhook.js';
import { Route as userByIdRoute } from '../app/routes/api/auth/users/$id.js';
import { Route as productsRoute } from '../app/routes/api/products.js';
import { Route as productsLedgerRoute } from '../app/routes/api/products/ledger.js';
import { Route as productByIdLedgerRoute } from '../app/routes/api/products/$id/ledger.js';
import { Route as adjustStockRoute } from '../app/routes/api/products/$id/adjust-stock.js';
import { Route as productByIdRoute } from '../app/routes/api/products/$id.js';
import { Route as templatesRoute } from '../app/routes/api/import/templates.js';
import { Route as templateByIdRoute } from '../app/routes/api/import/templates/$id.js';
import { Route as uploadRoute } from '../app/routes/api/import/upload.js';
import { Route as confirmRoute } from '../app/routes/api/import/confirm.js';
import { Route as cancelRoute } from '../app/routes/api/import/cancel.js';
import { Route as activeSessionRoute } from '../app/routes/api/import/active-session.js';
import { Route as syncSessionRoute } from '../app/routes/api/import/active-session/sync.js';
import { Route as sessionsRoute } from '../app/routes/api/import/sessions.js';
import { Route as skuMappingsRoute } from '../app/routes/api/import/sku-mappings.js';
import { Route as reviewOrdersRoute } from '../app/routes/api/review/orders.js';
import { Route as resolveReviewRoute } from '../app/routes/api/review/resolve.js';
import { Route as reviewAmbiguousRoute } from '../app/routes/api/review/ambiguous.js';
import { Route as confirmSplitRoute } from '../app/routes/api/review/confirm-split.js';
import { Route as dashboardStatsRoute } from '../app/routes/api/dashboard/stats.js';
import { Route as opnameRoute } from '../app/routes/api/stock/opname.js';
import { Route as opnameByIdRoute } from '../app/routes/api/stock/opname/$id.js';
import { Route as stockHistoryRoute } from '../app/routes/api/stock/history.js';
import { Route as apiSplatRoute } from '../app/routes/api/$.js';
import { Route as chatMessagesRoute } from '../app/routes/api/chat/messages.js';
import { Route as chatContactsRoute } from '../app/routes/api/chat/contacts.js';
import { Route as chatReadRoute } from '../app/routes/api/chat/read.js';
import { Route as movementByIdRoute } from '../app/routes/api/stock/movements/$id.js';
import { createRootRoute, Router } from '@tanstack/react-router';

const rootRoute = createRootRoute();

const healthRouteUpdated = healthRoute.update({ id: '/api/health', path: '/api/health', getParentRoute: () => rootRoute });
const loginRouteUpdated = loginRoute.update({ id: '/api/auth/login', path: '/api/auth/login', getParentRoute: () => rootRoute });
const logoutRouteUpdated = logoutRoute.update({ id: '/api/auth/logout', path: '/api/auth/logout', getParentRoute: () => rootRoute });
const meRouteUpdated = meRoute.update({ id: '/api/auth/me', path: '/api/auth/me', getParentRoute: () => rootRoute });
const usersRouteUpdated = usersRoute.update({ id: '/api/auth/users', path: '/api/auth/users', getParentRoute: () => rootRoute });
const clerkWebhookRouteUpdated = clerkWebhookRoute.update({ id: '/api/auth/clerk-webhook', path: '/api/auth/clerk-webhook', getParentRoute: () => rootRoute });
const userByIdRouteUpdated = userByIdRoute.update({ id: '/api/auth/users/$id', path: '/api/auth/users/$id', getParentRoute: () => rootRoute });
const productsRouteUpdated = productsRoute.update({ id: '/api/products', path: '/api/products', getParentRoute: () => rootRoute });
const productsLedgerRouteUpdated = productsLedgerRoute.update({ id: '/api/products/ledger', path: '/api/products/ledger', getParentRoute: () => rootRoute });
const productByIdLedgerRouteUpdated = productByIdLedgerRoute.update({ id: '/api/products/$id/ledger', path: '/api/products/$id/ledger', getParentRoute: () => rootRoute });
const adjustStockRouteUpdated = adjustStockRoute.update({ id: '/api/products/$id/adjust-stock', path: '/api/products/$id/adjust-stock', getParentRoute: () => rootRoute });
const productByIdRouteUpdated = productByIdRoute.update({ id: '/api/products/$id', path: '/api/products/$id', getParentRoute: () => rootRoute });
const templatesRouteUpdated = templatesRoute.update({ id: '/api/import/templates', path: '/api/import/templates', getParentRoute: () => rootRoute });
const templateByIdRouteUpdated = templateByIdRoute.update({ id: '/api/import/templates/$id', path: '/api/import/templates/$id', getParentRoute: () => rootRoute });
const uploadRouteUpdated = uploadRoute.update({ id: '/api/import/upload', path: '/api/import/upload', getParentRoute: () => rootRoute });
const confirmRouteUpdated = confirmRoute.update({ id: '/api/import/confirm', path: '/api/import/confirm', getParentRoute: () => rootRoute });
const cancelRouteUpdated = cancelRoute.update({ id: '/api/import/cancel', path: '/api/import/cancel', getParentRoute: () => rootRoute });
const activeSessionRouteUpdated = activeSessionRoute.update({ id: '/api/import/active-session', path: '/api/import/active-session', getParentRoute: () => rootRoute });
const syncSessionRouteUpdated = syncSessionRoute.update({ id: '/api/import/active-session/sync', path: '/api/import/active-session/sync', getParentRoute: () => rootRoute });
const sessionsRouteUpdated = sessionsRoute.update({ id: '/api/import/sessions', path: '/api/import/sessions', getParentRoute: () => rootRoute });
const skuMappingsRouteUpdated = skuMappingsRoute.update({ id: '/api/import/sku-mappings', path: '/api/import/sku-mappings', getParentRoute: () => rootRoute });
const reviewOrdersRouteUpdated = reviewOrdersRoute.update({ id: '/api/review/orders', path: '/api/review/orders', getParentRoute: () => rootRoute });
const resolveReviewRouteUpdated = resolveReviewRoute.update({ id: '/api/review/resolve', path: '/api/review/resolve', getParentRoute: () => rootRoute });
const reviewAmbiguousRouteUpdated = reviewAmbiguousRoute.update({ id: '/api/review/ambiguous', path: '/api/review/ambiguous', getParentRoute: () => rootRoute });
const confirmSplitRouteUpdated = confirmSplitRoute.update({ id: '/api/review/confirm-split', path: '/api/review/confirm-split', getParentRoute: () => rootRoute });
const dashboardStatsRouteUpdated = dashboardStatsRoute.update({ id: '/api/dashboard/stats', path: '/api/dashboard/stats', getParentRoute: () => rootRoute });
const opnameRouteUpdated = opnameRoute.update({ id: '/api/stock/opname', path: '/api/stock/opname', getParentRoute: () => rootRoute });
const opnameByIdRouteUpdated = opnameByIdRoute.update({ id: '/api/stock/opname/$id', path: '/api/stock/opname/$id', getParentRoute: () => rootRoute });
const stockHistoryRouteUpdated = stockHistoryRoute.update({ id: '/api/stock/history', path: '/api/stock/history', getParentRoute: () => rootRoute });
const apiSplatRouteUpdated = apiSplatRoute.update({ id: '/api/$', path: '/api/$', getParentRoute: () => rootRoute });
const chatMessagesRouteUpdated = chatMessagesRoute.update({ id: '/api/chat/messages', path: '/api/chat/messages', getParentRoute: () => rootRoute });
const chatContactsRouteUpdated = chatContactsRoute.update({ id: '/api/chat/contacts', path: '/api/chat/contacts', getParentRoute: () => rootRoute });
const chatReadRouteUpdated = chatReadRoute.update({ id: '/api/chat/read', path: '/api/chat/read', getParentRoute: () => rootRoute });
const movementByIdRouteUpdated = movementByIdRoute.update({ id: '/api/stock/movements/$id', path: '/api/stock/movements/$id', getParentRoute: () => rootRoute });

rootRoute.addChildren([
  healthRouteUpdated,
  loginRouteUpdated,
  logoutRouteUpdated,
  meRouteUpdated,
  usersRouteUpdated,
  clerkWebhookRouteUpdated,
  userByIdRouteUpdated,
  productsRouteUpdated,
  productsLedgerRouteUpdated,
  productByIdLedgerRouteUpdated,
  adjustStockRouteUpdated,
  productByIdRouteUpdated,
  templatesRouteUpdated,
  templateByIdRouteUpdated,
  uploadRouteUpdated,
  confirmRouteUpdated,
  cancelRouteUpdated,
  activeSessionRouteUpdated,
  syncSessionRouteUpdated,
  sessionsRouteUpdated,
  skuMappingsRouteUpdated,
  reviewOrdersRouteUpdated,
  resolveReviewRouteUpdated,
  reviewAmbiguousRouteUpdated,
  confirmSplitRouteUpdated,
  dashboardStatsRouteUpdated,
  opnameRouteUpdated,
  opnameByIdRouteUpdated,
  stockHistoryRouteUpdated,
  apiSplatRouteUpdated,
  chatMessagesRouteUpdated,
  chatContactsRouteUpdated,
  chatReadRouteUpdated,
  movementByIdRouteUpdated
]);

const router = new Router({ routeTree: rootRoute });

let seedingPromise = null;
const apiCache = new Map();
const CACHE_TTL_MS = 5000; // 5-second cache for GET requests to eliminate redundant/concurrent requests

export const app = {
  async fetch(request, env, ctx) {
    let store;
    let isCloudflare = false;
    try {
      if (env && env.STOCK_ROOM) {
        isCloudflare = true;
      }
    } catch (e) {}

    if (isCloudflare) {
      const id = env.STOCK_ROOM.idFromName('global');
      const stub = env.STOCK_ROOM.get(id);
      store = {
        type: 'cloudflare',
        storage: {
          async query(sql, params) { return await stub.query(sql, params); },
          async queryValues(sql, params) { return await stub.queryValues(sql, params); },
          async execute(sql, params) { return await stub.execute(sql, params); },
          async executeTransaction(queries) { return await stub.executeTransaction(queries); }
        },
        env: env
      };
    } else {
      store = {
        type: 'local',
        storage: getLocalStore(),
        env: env
      };
    }

    return storageContext.run(store, async () => {
      if (process.env.NODE_ENV === 'test') {
        await seedIfNeeded(store.storage);
      } else {
        if (!seedingPromise) {
          seedingPromise = seedIfNeeded(store.storage).catch(err => {
            seedingPromise = null;
            throw err;
          });
        }
        await seedingPromise;
      }
      
      try {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase();

        // Local development DB migration endpoint
        if (path === '/api/dev/migrate' && method === 'POST') {
          const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
          const authHeader = request.headers.get('Authorization');
          const isAuthorized = isLocalhost || (env && env.MIGRATE_KEY && authHeader === `Bearer ${env.MIGRATE_KEY}`);
          
          if (!isAuthorized) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          try {
            const payload = await request.json();
            const sqlStatements = payload.statements || [];
            
            let results = [];
            if (sqlStatements.length > 0) {
              const id = env.STOCK_ROOM.idFromName('global');
              const stub = env.STOCK_ROOM.get(id);
              const queries = sqlStatements.map(sql => ({ sql, params: [] }));
              results = await stub.executeTransaction(queries);
            }
            
            return new Response(JSON.stringify({ success: true, count: results.length }), {
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (err) {
            return new Response(JSON.stringify({ success: false, error: err.message }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }

        const isGetApi = method === 'GET' && path.startsWith('/api/') && path !== '/api/health' && !path.startsWith('/api/auth/');
        if (isGetApi) {
          const cached = apiCache.get(path);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return new Response(cached.body, {
              status: cached.status,
              headers: new Headers(cached.headers)
            });
          }
        } else if (method !== 'GET') {
          apiCache.clear();
        }

        let response = null;

        if (path === '/ws' && env && env.STOCK_ROOM) {
          const id = env.STOCK_ROOM.idFromName('global');
          const stub = env.STOCK_ROOM.get(id);
          response = await stub.fetch(request);
        } else {
          try {
            const matched = router.getMatchedRoutes(path);
            if (matched && matched.foundRoute && matched.foundRoute !== rootRoute) {
              const handlers = matched.foundRoute.options?.server?.handlers;
              if (handlers && handlers[method]) {
                response = await handlers[method]({ request, params: matched.routeParams });
              }
            }
          } catch (e) {
            // Ignore route matching errors, will default to 404
          }
        }

        if (!response) {
          response = new Response(JSON.stringify({ message: 'Not Found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (isGetApi && response && response.status === 200) {
          try {
            const clonedResponse = response.clone();
            const bodyText = await clonedResponse.text();
            apiCache.set(path, {
              body: bodyText,
              status: response.status,
              headers: Array.from(response.headers.entries()),
              timestamp: Date.now()
            });
          } catch (e) {
            console.error("Cache store error:", e);
          }
        }

        if (response.status === 101) {
          return response;
        }
        try {
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          response.headers.set('Pragma', 'no-cache');
          response.headers.set('Expires', '0');
          return response;
        } catch (e) {
          const mutableRes = new Response(response.body, response);
          mutableRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          mutableRes.headers.set('Pragma', 'no-cache');
          mutableRes.headers.set('Expires', '0');
          return mutableRes;
        }
      } catch (err) {
        if (err.name === 'BadRequestError' || err.status === 400) {
          return new Response(JSON.stringify({ message: err.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        console.error("Request handling error:", err);
        return new Response(JSON.stringify({ message: err.message || 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });
  },

  async request(path, options = {}) {
    const url = `http://localhost${path}`;
    const headers = new Headers(options.headers || {});
    const req = new Request(url, {
      method: options.method || 'GET',
      headers,
      body: options.body
    });
    return this.fetch(req);
  }
};
