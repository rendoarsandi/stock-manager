import { createFileRoute } from '@tanstack/react-router';
import { handleGetSessions, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/sessions')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleGetSessions, { auth: true }),
    },
  },
});
