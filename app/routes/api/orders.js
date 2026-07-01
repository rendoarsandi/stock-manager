import { createFileRoute } from '@tanstack/react-router';
import { handleListOrders, withAuthOrRole } from '../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/orders')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleListOrders, { auth: true }),
    },
  },
});
