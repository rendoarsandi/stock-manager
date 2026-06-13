import { createFileRoute } from '@tanstack/react-router';
import { handleListLedger, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/products/ledger')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleListLedger, { auth: true }),
    },
  },
});
