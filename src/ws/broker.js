import { WebSocketServer } from 'ws';
import { getActiveStorage, storageContext, getActiveEnv } from '../db/context.js';

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
        broadcastCount();
        
        ws.on('message', (msg) => {
          try {
            const parsed = JSON.parse(msg.toString());
            // Broadcast any client message (like MOUSE_MOVE) to all other clients
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

  // 1. Broadcast to local Node.js clients
  for (const client of localClients) {
    if (client === excludeWs) continue;
    if (client.readyState === 1) { // OPEN
      try {
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

