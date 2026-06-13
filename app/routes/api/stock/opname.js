import { createFileRoute } from '@tanstack/react-router';
import { handleListOpname, handleCreateOpname, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/stock/opname')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleListOpname, { auth: true }),
      POST: withAuthOrRole(handleCreateOpname, { auth: true }),
    },
  },
});
