import { WebSocketServer } from 'ws';
import { getActiveStorage, storageContext, getActiveEnv } from '../db/context.js';
import { verifyJwt } from '../utils/crypto.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const localClients = new Set();
let localWss = null;

/**
 * Setup WebSocket server for local Node.js environment.
 * Intercepts 'upgrade' event on the HTTP server.
 */
export function setupLocalWebSocket(server) {
  localWss = new WebSocketServer({ noServer: true });
  
  const broadcastCount = () => {
    broadcast({
      type: 'ONLINE_COUNT',
      count: localClients.size
    });
  };

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      localWss.handleUpgrade(request, socket, head, (ws) => {
        localClients.add(ws);

        // Try to authenticate during handshake upgrade using cookies
        let userId = null;
        try {
          const cookieHeader = request.headers.cookie || '';
          const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('token='));
          if (tokenCookie) {
            const token = decodeURIComponent(tokenCookie.split('=')[1] || '').trim();
            const payload = verifyJwt(token, JWT_SECRET);
            if (payload && payload.id) {
              userId = payload.id;
            }
          }
        } catch (e) {
          console.error('WebSocket auth parsing failed:', e);
        }
        ws.userId = userId;

        broadcastCount();
        
        ws.on('message', (msg) => {
          try {
            const parsed = JSON.parse(msg.toString());
            // Support IDENTIFY fallback from client
            if (parsed.type === 'IDENTIFY') {
              if (parsed.userId) {
                ws.userId = parseInt(parsed.userId, 10);
              }
              return;
            }
            broadcast(parsed, ws);
          } catch (e) {
            console.error('Error handling local WS message:', e);
          }
        });

        ws.on('close', () => {
          localClients.delete(ws);
          broadcastCount();
        });
        
        ws.on('error', (err) => {
          console.error('Local WebSocket error:', err);
          localClients.delete(ws);
          broadcastCount();
        });
      });
    } else {
      socket.destroy();
    }
  });
}

/**
 * Broadcasts a message to all connected clients.
 * Isomorphic: handles both local Node.js clients and Durable Object WebSockets.
 */
export function broadcast(message, excludeWs = null) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  const parsed = typeof message === 'string' ? JSON.parse(message) : message;

  // 1. Broadcast to local Node.js clients with security boundary checks
  for (const client of localClients) {
    if (client === excludeWs) continue;
    if (client.readyState === 1) { // OPEN
      try {
        // If it is a CHAT_MESSAGE, perform target verification to prevent leaks
        if (parsed.type === 'CHAT_MESSAGE') {
          const senderId = parseInt(parsed.sender_id, 10);
          const receiverId = parseInt(parsed.receiver_id, 10);
          const clientUserId = client.userId ? parseInt(client.userId, 10) : null;
          
          if (clientUserId !== senderId && clientUserId !== receiverId) {
            continue; // Skip: do not leak private conversations to unauthorized users
          }
        }
        client.send(payload);
      } catch (err) {
        console.error('Error broadcasting to local client:', err);
        localClients.delete(client);
      }
    }
  }

  // 2. Broadcast to Cloudflare Durable Object clients via RPC
  try {
    const env = getActiveEnv();
    if (env && env.STOCK_ROOM) {
      const id = env.STOCK_ROOM.idFromName('global');
      const stub = env.STOCK_ROOM.get(id);
      stub.broadcast(payload);
    }
  } catch (err) {
    // Not running in Cloudflare DO context or error fetching websockets
  }
}
