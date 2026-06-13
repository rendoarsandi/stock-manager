import { createFileRoute } from '@tanstack/react-router';
import { handleDeleteUser, withAuthOrRole } from '../../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/users/$id')({
  server: {
    handlers: {
      DELETE: withAuthOrRole(handleDeleteUser, { role: 'admin' }),
    },
  },
});
