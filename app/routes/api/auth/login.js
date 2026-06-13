import { createFileRoute } from '@tanstack/react-router';
import { handleLogin, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleLogin),
    },
  },
});
