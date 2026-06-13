import { createFileRoute } from '@tanstack/react-router';
import { handleLogout, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleLogout),
    },
  },
});
