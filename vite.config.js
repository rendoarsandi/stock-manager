import { defineConfig, loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { setupLocalWebSocket } from './src/ws/broker.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './app')
      }
    }
  };
});
