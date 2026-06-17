import { createFileRoute } from '@tanstack/react-router';
import { handleReturnedOrders, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/review/returned')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleReturnedOrders, { auth: true }),
    },
  },
});
