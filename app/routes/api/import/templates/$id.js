import { createFileRoute } from '@tanstack/react-router';
import { handleDeleteTemplate, withAuthOrRole } from '../../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/templates/$id')({
  server: {
    handlers: {
      DELETE: withAuthOrRole(handleDeleteTemplate, { role: 'admin' }),
    },
  },
});
