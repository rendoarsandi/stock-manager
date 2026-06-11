import { Hono } from 'hono';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import importsRouter from './routes/import.js';
import reviewRouter from './routes/review.js';
import dashboardRouter from './routes/dashboard.js';
import opnameRouter from './routes/opname.js';

import { storageContext } from './db/context.js';
import { seedIfNeeded } from './db/connection.js';
import { getLocalStore } from './db/local_sqlite.js';

export const app = new Hono();

// Prevent browser caching for static resources and SPA files
app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  await next();
});

// Global database and execution context middleware
app.use('*', async (c, next) => {
  let store;
  let isCloudflare = false;
  try {
    if (c.env && c.env.STOCK_ROOM) {
      isCloudflare = true;
    }
  } catch (e) {}

  if (isCloudflare) {
    const id = c.env.STOCK_ROOM.idFromName('global');
    const stub = c.env.STOCK_ROOM.get(id);
    store = {
      type: 'cloudflare',
      storage: {
        async query(sql, params) { return await stub.query(sql, params); },
        async execute(sql, params) { return await stub.execute(sql, params); },
        async executeTransaction(queries) { return await stub.executeTransaction(queries); }
      },
      env: c.env
    };
  } else {
    store = {
      type: 'local',
      storage: getLocalStore(),
      env: c.env
    };
  }

  return storageContext.run(store, async () => {
    await seedIfNeeded(store.storage);
    return await next();
  });
});

// Mount API routes
app.route('/api/auth', authRouter);
app.route('/api/products', productsRouter);
app.route('/api/import', importsRouter);
app.route('/api/review', reviewRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/stock/opname', opnameRouter);

// Standard API response to check server health
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', time: new Date().toISOString() });
});
