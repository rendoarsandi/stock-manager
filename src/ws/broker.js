import { WebSocketServer } from 'ws';
import { getActiveStorage, storageContext } from '../db/context.js';

const localClients = new Set();
let localWss = null;

/**
 * Setup WebSocket server for local Node.js environment.
 * Intercepts 'upgrade' event on the HTTP server.
 */
export function setupLocalWebSocket(server) {
  localWss = new WebSocketServer({ noServer: true });
  
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      localWss.handleUpgrade(request, socket, head, (ws) => {
        localClients.add(ws);
        
        ws.on('close', () => {
          localClients.delete(ws);
        });
        
        ws.on('error', (err) => {
          console.error('Local WebSocket error:', err);
          localClients.delete(ws);
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
export function broadcast(message) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);

  // 1. Broadcast to local Node.js clients
  for (const client of localClients) {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(payload);
      } catch (err) {
        console.error('Error broadcasting to local client:', err);
        localClients.delete(client);
      }
    }
  }

  // 2. Broadcast to Cloudflare Durable Object clients (if active in DO context)
  try {
    const store = storageContext.getStore();
    if (store && store.state && typeof store.state.getWebSockets === 'function') {
      const websockets = store.state.getWebSockets();
      for (const ws of websockets) {
        try {
          ws.send(payload);
        } catch (err) {
          console.error('Error broadcasting to DO client:', err);
        }
      }
    }
  } catch (err) {
    // Not running in Cloudflare DO context or error fetching websockets
  }
}
