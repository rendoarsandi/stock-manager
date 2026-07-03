/* global WebSocketRequestResponsePair */
import { DurableObject } from 'cloudflare:workers';
import { app } from './app.js';
import { storageContext } from './db/context.js';
import { seedIfNeeded } from './db/connection.js';
import { schemaSql } from './db/schema.sql.js';



import server_default from '../dist/server/server.js';

// Fallback for Worker static assets or SSR routes
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Handle WebSocket handshake or dev migration endpoint
    if (url.pathname === '/ws' || url.pathname === '/api/dev/migrate' || url.pathname === '/api/dev/export') {
      return app.fetch(request, env, ctx);
    }
    
    // 2. Serve static assets via Cloudflare Assets
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(url.pathname);
    if (hasFileExtension && env.ASSETS) {
      try {
        return await env.ASSETS.fetch(request);
      } catch (err) {
        console.error("Failed to serve static asset:", err);
      }
    }
    
    // 3. Run TanStack Start SSR handler for API and Page requests
    try {
      globalThis.MINIMAL_CLOUDFLARE_ENV = env;
      globalThis.MINIMAL_CLOUDFLARE_CTX = ctx;
      return await server_default.fetch(request, env, ctx);
    } catch (err) {
      console.error("SSR Handler failed:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};

// Durable Object Class for SQL Storage and WebSockets
export class StockRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    
    // Lazy initialize schema: check if table 'users' exists before executing full schema script
    try {
      const tableCheck = this.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
      const row = tableCheck.one();
      if (!row) {
        this.sql.exec(schemaSql);
      } else {
        // Ensure index statements are executed for existing databases
        this.sql.exec("CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id)");
        this.sql.exec("CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)");
        this.sql.exec("CREATE INDEX IF NOT EXISTS idx_orders_import_session_id ON orders(import_session_id)");
        this.sql.exec("CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id)");
        this.sql.exec("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)");
        this.sql.exec("CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)");
      }
    } catch (err) {
      console.error("Failed to check/run schema in DO constructor:", err);
    }

    // Set auto-response for websocket pings to prevent waking up Durable Object
    try {
      this.ctx.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair("ping", "pong")
      );
    } catch (e) {}
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

  queryValues(sqlStr, params = []) {
    try {
      const cursor = this.sql.exec(sqlStr, ...params);
      return cursor.raw().toArray();
    } catch (err) {
      console.error(`DO queryValues failed: ${sqlStr}`, err);
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
      this.ctx.storage.transactionSync(() => {
        for (const q of queries) {
          this.sql.exec(q.sql, ...(q.params || []));
          results.push({ lastInsertRowid: null });
        }
      });
    } catch (err) {
      console.error("DO transaction failed", err);
      throw err;
    }
    return results;
  }

  // RPC to broadcast message to all connected WS clients
  broadcast(payload, excludeWs = null) {
    const websockets = this.ctx.getWebSockets();
    let parsed = null;
    try {
      parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (e) {}

    for (const ws of websockets) {
      if (ws === excludeWs) continue;

      // If it is a CHAT_MESSAGE, perform target verification to prevent leaks
      if (parsed && parsed.type === 'CHAT_MESSAGE') {
        const senderId = parseInt(parsed.sender_id, 10);
        const receiverId = parseInt(parsed.receiver_id, 10);
        
        let clientUserId = ws.userId;
        if (!clientUserId) {
          try {
            const attachment = this.ctx.getWebSocketAttachment(ws);
            clientUserId = attachment ? attachment.userId : null;
          } catch (e) {}
        }
        
        if (clientUserId) {
          const parsedClientUserId = parseInt(clientUserId, 10);
          if (parsedClientUserId !== senderId && parsedClientUserId !== receiverId) {
            continue; // Skip: do not leak private conversations to unauthorized users
          }
        } else {
          // If the connection hasn't identified itself yet, do not send chat messages to it.
          continue;
        }
      }

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

  // Handle incoming DO WebSocket messages
  webSocketMessage(ws, message) {
    try {
      const payloadString = typeof message === 'string' ? message : new globalThis.TextDecoder().decode(message);
      let parsed = null;
      try {
        parsed = JSON.parse(payloadString);
      } catch (e) {}

      if (parsed && parsed.type === 'IDENTIFY') {
        if (parsed.userId) {
          const userId = parseInt(parsed.userId, 10);
          ws.userId = userId;
          try {
            this.ctx.setWebSocketAttachment(ws, { userId });
          } catch (e) {}
        }
        return; // Don't broadcast IDENTIFY messages
      }

      // Broadcast client message directly to all other clients
      this.broadcast(payloadString, ws);
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

  // WebSocket handshake
  async fetch(request) {
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      
      this.broadcastOnlineCount();
      
      return new Response(null, {
        status: 101,
        webSocket: pair[0]
      });
    }
    return new Response("Not found", { status: 404 });
  }
}
