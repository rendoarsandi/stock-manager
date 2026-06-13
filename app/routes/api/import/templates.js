import { createFileRoute } from '@tanstack/react-router';
import { handleListTemplates, handleSaveTemplate, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/templates')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleListTemplates, { auth: true }),
      POST: withAuthOrRole(handleSaveTemplate, { role: 'admin' }),
    },
  },
});
