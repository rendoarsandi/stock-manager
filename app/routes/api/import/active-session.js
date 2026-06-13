import { createFileRoute } from '@tanstack/react-router';
import { handleGetActiveSession, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/active-session')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleGetActiveSession, { auth: true }),
    },
  },
});
