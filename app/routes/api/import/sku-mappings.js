import { createFileRoute } from '@tanstack/react-router';
import { handleListSkuMappings, handleSaveSkuMapping, handleDeleteSkuMapping, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/import/sku-mappings')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleListSkuMappings, { auth: true }),
      POST: withAuthOrRole(handleSaveSkuMapping, { role: 'admin' }),
      DELETE: withAuthOrRole(handleDeleteSkuMapping, { role: 'admin' }),
    },
  },
});
