import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import server_default from '../dist/server/server.js';
import { setupLocalWebSocket } from './ws/broker.js';

const app = new Hono();

// Serve static assets from dist/client/
app.use('/assets/*', serveStatic({ root: './dist/client' }));

// Forward all other routes to TanStack Start fetch handler
app.all('*', (c) => {
  return server_default.fetch(c.req.raw);
});

const PORT = process.env.PORT || 3000;

const server = serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`Production server running on http://localhost:${info.port}`);
});

setupLocalWebSocket(server);
