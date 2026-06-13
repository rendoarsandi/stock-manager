import { createFileRoute } from '@tanstack/react-router';
import { handleAdjustStock, withAuthOrRole } from '../../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/products/$id/adjust-stock')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleAdjustStock, { auth: true }),
    },
  },
});
