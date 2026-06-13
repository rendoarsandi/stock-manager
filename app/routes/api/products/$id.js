import { createFileRoute } from '@tanstack/react-router';
import { handleUpdateProduct, handleDeleteProduct, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/products/$id')({
  server: {
    handlers: {
      PUT: withAuthOrRole(handleUpdateProduct, { role: 'admin' }),
      DELETE: withAuthOrRole(handleDeleteProduct, { role: 'admin' }),
    },
  },
});
