import { createFileRoute } from '@tanstack/react-router';
import { handleCancelImport, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/cancel')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleCancelImport, { auth: true }),
    },
  },
});
