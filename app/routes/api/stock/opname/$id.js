import { createFileRoute } from '@tanstack/react-router';
import { handleGetOpnameDetails, withAuthOrRole } from '../../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/stock/opname/$id')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleGetOpnameDetails, { auth: true }),
    },
  },
});
