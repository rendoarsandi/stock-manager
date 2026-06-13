import { createFileRoute } from '@tanstack/react-router';
import { handleHealth, withAuthOrRole } from '../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleHealth),
    },
  },
});
