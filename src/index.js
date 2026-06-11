import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { initDatabase } from './db/connection.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import importsRouter from './routes/import.js';
import reviewRouter from './routes/review.js';
import dashboardRouter from './routes/dashboard.js';
import opnameRouter from './routes/opname.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';


import { storageContext } from './db/context.js';
import { getLocalStore } from './db/local_kv.js';
import { seedIfNeeded } from './db/connection.js';
import { setupLocalWebSocket } from './ws/broker.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Hono app
const app = new Hono();

// Global database and execution context middleware
app.use('*', async (c, next) => {
  let store;
  let isCloudflare = false;
  try {
    if (c.executionCtx && c.executionCtx.storage) {
      isCloudflare = true;
    }
  } catch (e) {}

  if (isCloudflare) {
    store = {
      type: 'cloudflare',
      storage: c.executionCtx.storage,
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

// Serve static assets from public/css, public/js, etc.
app.use('/css/*', serveStatic({ root: './src/public' }));
app.use('/js/*', serveStatic({ root: './src/public' }));
app.use('/assets/*', serveStatic({ root: './src/public' }));

// Mount API routes
app.route('/api/auth', authRouter);
app.route('/api/products', productsRouter);
app.route('/api/import', importsRouter);
app.route('/api/review', reviewRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/stock/opname', opnameRouter);

// WebSocket route for Cloudflare DO / Production environment
app.get('/ws', async (c) => {
  if (c.env && c.env.STOCK_ROOM) {
    const id = c.env.STOCK_ROOM.idFromName('global');
    const stub = c.env.STOCK_ROOM.get(id);
    return stub.fetch(c.req.raw);
  }
  return c.text('WebSocket endpoint. Use a WebSocket client to connect.', 400);
});

// Standard API response to check server health
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', time: new Date().toISOString() });
});


// SPA fallback: Serve index.html for all non-API GET requests
app.get('/*', async (c, next) => {
  const pathUrl = c.req.path;
  if (pathUrl.startsWith('/api')) {
    return next();
  }
  
  try {
    const indexPath = path.resolve(__dirname, 'public/index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf8');
      return c.html(html);
    }
  } catch (err) {
    console.error("Error serving SPA index.html:", err);
  }
  return c.text('Not Found', 404);
});

// Start-up logic
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize DB
    await initDatabase();
    console.log("Database initialized successfully.");

    // Find local IP address
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          localIp = net.address;
          break;
        }
      }
      if (localIp !== 'localhost') break;
    }

    const server = serve({
      fetch: app.fetch,
      port: PORT,
      hostname: '0.0.0.0'
    }, (info) => {
      console.log(`Server is running:`);
      console.log(`  - Local:   http://localhost:${info.port}`);
      if (localIp !== 'localhost') {
        console.log(`  - Network: http://${localIp}:${info.port}`);
      }
    });

    setupLocalWebSocket(server);

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
