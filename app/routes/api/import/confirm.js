import { createFileRoute } from '@tanstack/react-router';
import { handleConfirmImport, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/confirm')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleConfirmImport, { auth: true }),
    },
  },
});
