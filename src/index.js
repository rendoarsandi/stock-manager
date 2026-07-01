import { serve } from './utils/server_adapter.js';
import { app } from './app.js';
import { setupLocalWebSocket } from './ws/broker.js';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function serveStaticFile(urlPath) {
  const publicDir = path.resolve(path.join(__dirname, '../dist/client'));
  const filePath = path.resolve(path.join(publicDir, urlPath));

  // Security check: Path Traversal
  if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
    return null;
  }

  try {
    const stat = await fsPromises.stat(filePath);
    if (stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = await fsPromises.readFile(filePath);
      return new Response(content, {
        status: 200,
        headers: { 'Content-Type': contentType }
      });
    }
  } catch (e) {}
  return null;
}

const apiFetch = app.fetch;

async function entryFetch(request) {
  const url = new URL(request.url);
  const pathUrl = url.pathname;

  // 1. Static Assets
  if (pathUrl.startsWith('/css/') || pathUrl.startsWith('/js/') || pathUrl.startsWith('/assets/')) {
    const staticRes = await serveStaticFile(pathUrl);
    if (staticRes) return staticRes;
  }

  // 2. API Routes
  if (pathUrl.startsWith('/api') || pathUrl === '/ws') {
    return apiFetch(request);
  }

  // 3. TanStack Start SSR handler
  if (request.method === 'GET') {
    try {
      const mod = await import('../dist/server/server.js');
      const server_default = mod.default;
      return await server_default.fetch(request);
    } catch (err) {
      console.error("SSR Handler failed:", err);
    }
  }

  return new Response('Not Found', { status: 404 });
}

// Start-up logic
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
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
      fetch: entryFetch,
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
