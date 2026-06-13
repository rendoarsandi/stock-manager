import { DurableObject } from 'cloudflare:workers';
import { app } from './app.js';
import { storageContext } from './db/context.js';
import { seedIfNeeded } from './db/connection.js';
import { schemaSql } from './db/schema.sql.js';

// WebSocket route for Cloudflare DO / Production environment
app.get('/ws', async (c) => {
  if (c.env && c.env.STOCK_ROOM) {
    const id = c.env.STOCK_ROOM.idFromName('global');
    const stub = c.env.STOCK_ROOM.get(id);
    return stub.fetch(c.req.raw);
  }
  return c.text('WebSocket not configured', 400);
});

import server_default from '../dist/server/server.js';

// Fallback for Worker static assets or SSR routes
app.get('/*', async (c, next) => {
  const pathUrl = c.req.path;
  if (pathUrl.startsWith('/api') || pathUrl.startsWith('/ws')) {
    return next();
  }
  
  // Serve static assets via Cloudflare Assets
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathUrl);
  if (hasFileExtension) {
    if (c.env && c.env.ASSETS) {
      return await c.env.ASSETS.fetch(c.req.raw);
    }
    return next();
  }
  
  // Run TanStack Start SSR handler for page requests
  try {
    return await server_default.fetch(c.req.raw);
  } catch (err) {
    console.error("SSR Handler failed:", err);
    return c.text("Internal Server Error", 500);
  }
});

export default app;

// Durable Object Class for SQL Storage and WebSockets
export class StockRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    
    // Initialize schema synchronously in constructor
    try {
      this.sql.exec(schemaSql);
    } catch (err) {
      console.error("Failed to run schema in DO constructor:", err);
    }
  }

  // RPC methods
  query(sqlStr, params = []) {
    try {
      const cursor = this.sql.exec(sqlStr, ...params);
      return cursor.toArray();
    } catch (err) {
      console.error(`DO query failed: ${sqlStr}`, err);
      throw err;
    }
  }

  execute(sqlStr, params = []) {
    try {
      this.sql.exec(sqlStr, ...params);
      const cursor = this.sql.exec("SELECT last_insert_rowid() AS id");
      const row = cursor.one();
      return {
        lastInsertRowid: row ? row.id : null
      };
    } catch (err) {
      console.error(`DO execute failed: ${sqlStr}`, err);
      throw err;
    }
  }

  executeTransaction(queries) {
    const results = [];
    try {
      this.sql.exec("BEGIN TRANSACTION");
      for (const q of queries) {
        this.sql.exec(q.sql, ...(q.params || []));
        const cursor = this.sql.exec("SELECT last_insert_rowid() AS id");
        const row = cursor.one();
        results.push({ lastInsertRowid: row ? row.id : null });
      }
      this.sql.exec("COMMIT");
    } catch (err) {
      this.sql.exec("ROLLBACK");
      console.error("DO transaction failed", err);
      throw err;
    }
    return results;
  }

  // RPC to broadcast message to all connected WS clients
  broadcast(payload, excludeWs = null) {
    const websockets = this.ctx.getWebSockets();
    for (const ws of websockets) {
      if (ws === excludeWs) continue;
      try {
        ws.send(payload);
      } catch (err) {
        console.error('Error broadcasting from DO:', err);
      }
    }
  }

  // Broadcast the number of online clients
  broadcastOnlineCount() {
    const websockets = this.ctx.getWebSockets();
    const payload = JSON.stringify({
      type: 'ONLINE_COUNT',
      count: websockets.length
    });
    for (const ws of websockets) {
      try {
        ws.send(payload);
      } catch (err) {
        console.error('Error broadcasting online count from DO:', err);
      }
    }
  }

  // Handle incoming DO WebSocket messages (e.g. MOUSE_MOVE cursor events)
  webSocketMessage(ws, message) {
    try {
      // Broadcast client message directly to all other clients
      this.broadcast(message, ws);
    } catch (err) {
      console.error('Error in DO webSocketMessage:', err);
    }
  }

  webSocketClose(ws, code, reason, wasClean) {
    this.broadcastOnlineCount();
  }

  webSocketError(ws, error) {
    this.broadcastOnlineCount();
  }

  webSocketOpen(ws) {
    this.broadcastOnlineCount();
  }

  // WebSocket handshake
  async fetch(request) {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      
      return new Response(null, {
        status: 101,
        webSocket: pair[0]
      });
    }
    return new Response("Not found", { status: 404 });
  }
}
