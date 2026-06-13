import { createFileRoute } from '@tanstack/react-router';
import { handleReviewOrders, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/review/orders')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleReviewOrders, { auth: true }),
    },
  },
});
