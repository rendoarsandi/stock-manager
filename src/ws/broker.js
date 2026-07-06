import { WebSocketServer } from 'ws';
import { Effect, Ref, Option } from 'effect';
import { getActiveStorage, storageContext, getActiveEnv } from '../db/context.js';
import { verifyJwt } from '../utils/crypto.js';

function getJwtSecret() {
  const secret = globalThis.MINIMAL_CLOUDFLARE_ENV?.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && process.env.npm_lifecycle_event !== 'build') {
      if (!globalThis.MINIMAL_CLOUDFLARE_ENV) {
        throw new Error("JWT_SECRET env variable is required in production.");
      }
    }
    return 'dev_secret_key';
  }
  return secret;
}

// Thread-safe Ref wrapper for local client Set
const localClientsRef = Ref.unsafeMake(new Set());

/**
 * Retrieves the JWT Secret wrapped in an Effect
 */
export const getJwtSecretEffect = Effect.sync(() => getJwtSecret());

/**
 * Validates the token and returns the optional User ID
 */
export const verifyWsAuthEffect = (cookieHeader) =>
  Effect.gen(function* () {
    if (!cookieHeader) return Option.none();
    const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('token='));
    if (!tokenCookie) return Option.none();

    const token = decodeURIComponent(tokenCookie.split('=')[1] || '').trim();
    const secret = yield* getJwtSecretEffect;

    return yield* Effect.try({
      try: () => {
        const payload = verifyJwt(token, secret);
        if (payload && payload.id) {
          return Option.some(payload.id);
        }
        return Option.none();
      },
      catch: (e) => {
        console.error('WebSocket auth parsing failed:', e);
        return Option.none();
      }
    });
  });

/**
 * Broadcasts the current online count to all clients
 */
export const broadcastCountEffect = () =>
  Effect.gen(function* () {
    const clients = yield* Ref.get(localClientsRef);
    yield* broadcastEffect({
      type: 'ONLINE_COUNT',
      count: clients.size
    });
  });

/**
 * Process single WebSocket message
 */
export const handleMessageEffect = (ws, msgStr) =>
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => JSON.parse(msgStr),
      catch: (e) => new Error('Invalid JSON message')
    });

    if (parsed.type === 'IDENTIFY') {
      if (parsed.userId) {
        ws.userId = parseInt(parsed.userId, 10);
      }
      return;
    }

    yield* broadcastEffect(parsed, ws);
  }).pipe(
    Effect.catchAll((err) =>
      Effect.sync(() => console.error('Error handling local WS message:', err))
    )
  );

/**
 * Isomorphic Broadcast: local clients + Cloudflare DO RPC
 */
export const broadcastEffect = (message, excludeWs = null) =>
  Effect.gen(function* () {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const parsed = typeof message === 'string' ? JSON.parse(message) : message;

    const clients = yield* Ref.get(localClientsRef);

    for (const client of clients) {
      if (client === excludeWs) continue;
      if (client.readyState === 1) { // OPEN
        yield* Effect.try({
          try: () => {
            if (parsed.type === 'CHAT_MESSAGE') {
              const senderId = parseInt(parsed.sender_id, 10);
              const receiverId = parseInt(parsed.receiver_id, 10);
              const clientUserId = client.userId ? parseInt(client.userId, 10) : null;

              if (clientUserId !== senderId && clientUserId !== receiverId) {
                return; // Skip private chats
              }
            }
            client.send(payload);
          },
          catch: (err) => {
            console.error('Error broadcasting to local client:', err);
            clients.delete(client);
          }
        });
      }
    }

    // Broadcast to Cloudflare Durable Object clients via RPC
    yield* Effect.try({
      try: () => {
        const env = getActiveEnv();
        if (env && env.STOCK_ROOM) {
          const id = env.STOCK_ROOM.idFromName('global');
          const stub = env.STOCK_ROOM.get(id);
          stub.broadcast(payload);
        }
      },
      catch: () => {
        // Safe fallback outside Durable Object environment
      }
    }).pipe(Effect.orElse(() => Effect.void));
  });

/**
 * Handle new local WebSocket client and register event listeners
 */
export const handleClientConnectionEffect = (ws, request) =>
  Effect.gen(function* () {
    yield* Ref.update(localClientsRef, (clients) => {
      clients.add(ws);
      return clients;
    });

    const cookieHeader = request.headers.cookie || '';
    const maybeUserId = yield* verifyWsAuthEffect(cookieHeader);
    ws.userId = Option.getOrNull(maybeUserId);

    yield* broadcastCountEffect();

    ws.on('message', (msg) => {
      Effect.runPromise(handleMessageEffect(ws, msg.toString()));
    });

    const cleanup = () => {
      Effect.runPromise(
        Effect.gen(function* () {
          yield* Ref.update(localClientsRef, (clients) => {
            clients.delete(ws);
            return clients;
          });
          yield* broadcastCountEffect();
        })
      );
    };

    ws.on('close', cleanup);
    ws.on('error', (err) => {
      console.error('Local WebSocket error:', err);
      cleanup();
    });
  });

/**
 * HTTP server upgrade handler wrapped in an Effect
 */
export const setupLocalWebSocketEffect = (server) =>
  Effect.sync(() => {
    const localWss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws') {
        localWss.handleUpgrade(request, socket, head, (ws) => {
          Effect.runPromise(handleClientConnectionEffect(ws, request));
        });
      }
    });
  });

// --- Backward-compatible sync/async API wrappers using Effect runner ---

/**
 * Setup WebSocket server for local Node.js environment.
 * Intercepts 'upgrade' event on the HTTP server.
 */
export function setupLocalWebSocket(server) {
  return Effect.runSync(setupLocalWebSocketEffect(server));
}

/**
 * Broadcasts a message to all connected clients.
 * Isomorphic: handles both local Node.js clients and Durable Object WebSockets.
 */
export function broadcast(message, excludeWs = null) {
  return Effect.runFork(broadcastEffect(message, excludeWs));
}
