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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Hono app
const app = new Hono();

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

    serve({
      fetch: app.fetch,
      port: PORT
    }, (info) => {
      console.log(`Server is running at http://localhost:${info.port}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
