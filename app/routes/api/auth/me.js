import { createFileRoute } from '@tanstack/react-router';
import { handleMe, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleMe, { allowUnregistered: true, auth: true }),
    },
  },
});
