import { createFileRoute } from '@tanstack/react-router';
import { handleResolveReviewOrder, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/review/resolve')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleResolveReviewOrder, { auth: true }),
    },
  },
});
