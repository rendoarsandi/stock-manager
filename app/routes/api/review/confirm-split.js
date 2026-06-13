import { createFileRoute } from '@tanstack/react-router';
import { handleConfirmSplit, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/review/confirm-split')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleConfirmSplit, { auth: true }),
    },
  },
});
