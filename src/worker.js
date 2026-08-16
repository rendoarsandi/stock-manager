/* global WebSocketRequestResponsePair */
import { DurableObject } from 'cloudflare:workers';
import { app } from './app.js';
import { schemaSql } from './db/schema.sql.js';
import { verifyJwt } from './utils/crypto.js';

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

// Precompiled regex mapping to check mutations (INSERT, UPDATE, DELETE) for specific tables
const TABLE_MUTATION_PATTERNS = {
  users: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?USERS[`"]?\b/i,
  products: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?PRODUCTS[`"]?\b/i,
  stock_movements: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?STOCK_MOVEMENTS[`"]?\b/i,
  orders: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?ORDERS[`"]?\b/i,
  order_items: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?ORDER_ITEMS[`"]?\b/i,
  stock_opnames: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?STOCK_OPNAMES[`"]?\b/i,
  sku_mappings: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?SKU_MAPPINGS[`"]?\b/i,
  import_sessions: /(?:UPDATE|INSERT(?:\s+OR\s+\w+)?\s+INTO|DELETE\s+FROM)\s+[`"]?IMPORT_SESSIONS[`"]?\b/i
};

// Helper to detect which tables are modified by a query to support subscriptions
function getModifiedTables(sqlStr) {
  // Strip comments (both block and line-level) before analysis to avoid false positives
  let cleaned = sqlStr.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/--.*$/gm, "").toUpperCase();

  if (!cleaned.includes("INSERT") && !cleaned.includes("UPDATE") && !cleaned.includes("DELETE")) {
    return [];
  }

  const modified = [];
  for (const [table, regex] of Object.entries(TABLE_MUTATION_PATTERNS)) {
    if (regex.test(cleaned)) {
      modified.push(table);
    }
  }
  return modified;
}

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
      }
    } catch (err) {
      console.error("Failed to check/run schema in DO constructor:", err);
    }

    this.syncSequence = 0;

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

  notifyTableChange(tables, delta = null) {
    if (!tables || tables.length === 0) return;
    this.syncSequence = (this.syncSequence || 0) + 1;
    const currentSeq = this.syncSequence;

    const websockets = this.ctx.getWebSockets();
    const invalidatePayload = JSON.stringify({
      type: "INVALIDATE",
      tables: tables,
      sequenceId: currentSeq
    });

    let deltaPayload = null;
    if (delta && delta.table) {
      deltaPayload = JSON.stringify({
        type: "DELTA",
        sequenceId: currentSeq,
        timestamp: Date.now(),
        table: delta.table,
        action: delta.action || "UPDATE",
        row: delta.row || null,
        primaryKey: delta.primaryKey || null
      });
    }

    for (const ws of websockets) {
      try {
        const attachment = this.ctx.getWebSocketAttachment(ws);
        const subscriptions = attachment?.subscriptions || [];
        const hasSubscribed = tables.some(t => subscriptions.includes(t));
        if (hasSubscribed) {
          ws.send(invalidatePayload);
          if (deltaPayload) {
            ws.send(deltaPayload);
          }
        }
      } catch (err) {
        console.error('Error sending invalidate/delta message to client:', err);
      }
    }
  }

  execute(sqlStr, params = []) {
    try {
      this.sql.exec(sqlStr, ...params);
      const cursor = this.sql.exec("SELECT last_insert_rowid() AS id");
      const row = cursor.one();

      const modified = getModifiedTables(sqlStr);
      if (modified.length > 0) {
        this.notifyTableChange(modified);
      }

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
    const allModified = new Set();
    try {
      this.ctx.storage.transactionSync(() => {
        for (const q of queries) {
          this.sql.exec(q.sql, ...(q.params || []));
          const cursor = this.sql.exec("SELECT last_insert_rowid() AS id");
          const row = cursor.one();
          results.push({ lastInsertRowid: row ? row.id : null });
          const modified = getModifiedTables(q.sql);
          for (const t of modified) {
            allModified.add(t);
          }
        }
      });
      if (allModified.size > 0) {
        this.notifyTableChange(Array.from(allModified));
      }
    } catch (err) {
      console.error("DO transaction failed", err);
      throw err;
    }
    return results;
  }

  getAuthenticatedUserId(ws) {
    try {
      const attachment = this.ctx.getWebSocketAttachment(ws);
      if (attachment && attachment.userId) {
        return parseInt(attachment.userId, 10);
      }
    } catch (e) {}
    return ws.userId ? parseInt(ws.userId, 10) : null;
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
        
        const clientUserId = this.getAuthenticatedUserId(ws);
        if (clientUserId) {
          if (clientUserId !== senderId && clientUserId !== receiverId) {
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
        let userId = null;
        if (parsed.token) {
          const secret = this.env.JWT_SECRET || globalThis.MINIMAL_CLOUDFLARE_ENV?.JWT_SECRET || "dev_secret_key";
          const verified = verifyJwt(parsed.token, secret);
          if (verified && verified.userId) {
            userId = parseInt(verified.userId, 10);
          }
        } else if (parsed.userId) {
          userId = parseInt(parsed.userId, 10);
        }

        if (userId) {
          ws.userId = userId;
          try {
            const attachment = this.ctx.getWebSocketAttachment(ws) || {};
            attachment.userId = userId;
            this.ctx.setWebSocketAttachment(ws, attachment);
          } catch (e) {}
        } else {
          console.warn("Invalid IDENTIFY token received, closing websocket.");
          try {
            ws.close(4001, "Invalid Authentication Token");
          } catch (e) {}
        }
        return; // Don't broadcast IDENTIFY messages
      }

      if (parsed && parsed.type === 'SUBSCRIBE') {
        const authenticatedId = this.getAuthenticatedUserId(ws);
        if (!authenticatedId) {
          try { ws.close(4002, "Authentication Required for Subscriptions"); } catch (e) {}
          return;
        }
        if (Array.isArray(parsed.tables)) {
          try {
            const attachment = this.ctx.getWebSocketAttachment(ws) || {};
            attachment.subscriptions = Array.from(new Set([
              ...(attachment.subscriptions || []),
              ...parsed.tables
            ]));
            this.ctx.setWebSocketAttachment(ws, attachment);
          } catch (e) {}
        }
        return;
      }

      if (parsed && parsed.type === 'UNSUBSCRIBE') {
        const authenticatedId = this.getAuthenticatedUserId(ws);
        if (!authenticatedId) {
          try { ws.close(4002, "Authentication Required"); } catch (e) {}
          return;
        }
        if (Array.isArray(parsed.tables)) {
          try {
            const attachment = this.ctx.getWebSocketAttachment(ws) || {};
            if (attachment.subscriptions) {
              attachment.subscriptions = attachment.subscriptions.filter(t => !parsed.tables.includes(t));
              this.ctx.setWebSocketAttachment(ws, attachment);
            }
          } catch (e) {}
        }
        return;
      }

      if (parsed && parsed.type === 'RESYNC') {
        const authenticatedId = this.getAuthenticatedUserId(ws);
        if (!authenticatedId) {
          try { ws.close(4002, "Authentication Required for Resync"); } catch (e) {}
          return;
        }
        const sinceSequence = parseInt(parsed.sinceSequenceId || 0, 10);
        try {
          ws.send(JSON.stringify({
            type: 'RESYNC_ACK',
            currentSequenceId: this.syncSequence || 0,
            sinceSequenceId: sinceSequence,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Error sending RESYNC_ACK:', err);
        }
        return;
      }

      // Block sender identity spoofing: CHAT_MESSAGE sender_id must match authenticated userId
      if (parsed && parsed.type === 'CHAT_MESSAGE') {
        const authenticatedId = this.getAuthenticatedUserId(ws);
        if (!authenticatedId || parseInt(parsed.sender_id, 10) !== authenticatedId) {
          console.warn(`Impersonation blocked: Client ${authenticatedId} tried sending chat as ${parsed.sender_id}`);
          return; // Ignore / drop spoofed payload
        }
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

      let initialUserId = null;
      try {
        const cookieHeader = request.headers.get("Cookie") || "";
        const match = cookieHeader.match(/(?:jwt|token|auth_token|session)=([^;]+)/);
        const token = match ? decodeURIComponent(match[1]) : null;
        if (token) {
          const secret = this.env.JWT_SECRET || globalThis.MINIMAL_CLOUDFLARE_ENV?.JWT_SECRET || "dev_secret_key";
          const verified = verifyJwt(token, secret);
          if (verified && verified.userId) {
            initialUserId = parseInt(verified.userId, 10);
          }
        }
      } catch (e) {}

      this.ctx.acceptWebSocket(pair[1]);

      try {
        const attachment = {
          userId: initialUserId,
          subscriptions: ['products', 'orders', 'stock_movements', 'stock_opnames', 'sku_mappings', 'import_sessions']
        };
        this.ctx.setWebSocketAttachment(pair[1], attachment);
        if (initialUserId) {
          pair[1].userId = initialUserId;
        }
      } catch (e) {}
      
      this.broadcastOnlineCount();
      
      return new Response(null, {
        status: 101,
        webSocket: pair[0]
      });
    }
    return new Response("Not found", { status: 404 });
  }
}
