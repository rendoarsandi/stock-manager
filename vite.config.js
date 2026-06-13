import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { setupLocalWebSocket } from './src/ws/broker.js';

export default defineConfig({
  plugins: [
    tanstackStart({
      srcDirectory: './app',
    }),
    react(),
    tailwindcss(),
    {
      name: 'local-websocket',
      configureServer(server) {
        if (server.httpServer) {
          setupLocalWebSocket(server.httpServer);
        }
      }
    }
  ],
});
