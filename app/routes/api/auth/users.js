import { createFileRoute } from '@tanstack/react-router';
import { handleListUsers, handleCreateUser, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/users')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleListUsers, { role: 'admin' }),
      POST: withAuthOrRole(handleCreateUser, { role: 'admin' }),
    },
  },
});
