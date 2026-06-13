import { createFileRoute } from '@tanstack/react-router';
import { handleDashboardStats, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/dashboard/stats')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleDashboardStats, { auth: true }),
    },
  },
});
