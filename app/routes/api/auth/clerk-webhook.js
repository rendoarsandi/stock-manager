import { createFileRoute } from '@tanstack/react-router';
import { handleClerkWebhook } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/clerk-webhook')({
  server: {
    handlers: {
      POST: handleClerkWebhook,
    },
  },
});
