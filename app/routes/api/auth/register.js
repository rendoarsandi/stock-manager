import { createFileRoute } from '@tanstack/react-router';
import { handleRegister, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleRegister, { allowUnregistered: true, auth: true }),
    },
  },
});
