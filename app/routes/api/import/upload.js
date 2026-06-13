import { createFileRoute } from '@tanstack/react-router';
import { handleUploadExcel, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/upload')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleUploadExcel, { auth: true }),
    },
  },
});
