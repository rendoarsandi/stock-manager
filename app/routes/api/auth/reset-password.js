import { createFileRoute } from '@tanstack/react-router';
import { handleResetPassword, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/reset-password')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleResetPassword),
    },
  },
});
