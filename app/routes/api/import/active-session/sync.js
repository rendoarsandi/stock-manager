import { createFileRoute } from '@tanstack/react-router';
import { handleSyncActiveSession, withAuthOrRole } from '../../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/active-session/sync')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleSyncActiveSession, { auth: true }),
    },
  },
});
