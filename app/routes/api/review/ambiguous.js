import { createFileRoute } from '@tanstack/react-router';
import { handleReviewAmbiguous, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/review/ambiguous')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleReviewAmbiguous, { auth: true }),
    },
  },
});
