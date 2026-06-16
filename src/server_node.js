import { serve } from './utils/server_adapter.js';
import server_default from '../dist/server/server.js';
import { setupLocalWebSocket } from './ws/broker.js';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  const clientDir = path.resolve(path.join(__dirname, '../dist/client'));
  const filePath = path.resolve(path.join(clientDir, urlPath));

  // Security check: Path Traversal
  if (filePath !== clientDir && !filePath.startsWith(clientDir + path.sep)) {
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

async function entryFetch(request) {
  const url = new URL(request.url);
  const pathUrl = url.pathname;

  // Serve static assets from dist/client/assets/
  if (pathUrl.startsWith('/assets/')) {
    const staticRes = await serveStaticFile(pathUrl);
    if (staticRes) return staticRes;
  }

  // Forward all other routes to TanStack Start fetch handler
  return server_default.fetch(request);
}

const PORT = process.env.PORT || 3000;

const server = serve({
  fetch: entryFetch,
  port: PORT
}, (info) => {
  console.log(`Production server running on http://localhost:${info.port}`);
});

setupLocalWebSocket(server);
