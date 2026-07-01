import { createFileRoute } from '@tanstack/react-router';
import { handleUpdateMovement, handleDeleteMovement, withAuthOrRole } from '../../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/stock/movements/$id')({
  server: {
    handlers: {
      PUT: withAuthOrRole(handleUpdateMovement, { auth: true }),
      DELETE: withAuthOrRole(handleDeleteMovement, { auth: true }),
    },
  },
});
