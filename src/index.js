import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { app } from './app.js';
import { storageContext } from './db/context.js';
import { getLocalStore } from './db/local_sqlite.js';
import { seedIfNeeded } from './db/connection.js';
import { setupLocalWebSocket } from './ws/broker.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets from public/css, public/js, etc.
app.use('/css/*', serveStatic({ root: './src/public' }));
app.use('/js/*', serveStatic({ root: './src/public' }));
app.use('/assets/*', serveStatic({ root: './src/public' }));

// Local websocket endpoint placeholder (handled on upgrade)
app.get('/ws', async (c) => {
  return c.text('WebSocket endpoint. Use a WebSocket client to connect.', 400);
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
