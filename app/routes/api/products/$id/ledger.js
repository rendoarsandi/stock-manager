import { createFileRoute } from '@tanstack/react-router';
import { handleProductLedger, withAuthOrRole } from '../../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/products/$id/ledger')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleProductLedger, { auth: true }),
    },
  },
});
