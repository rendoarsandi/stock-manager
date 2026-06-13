import { createFileRoute } from '@tanstack/react-router';
import { handleListProducts, handleCreateProduct, withAuthOrRole } from '../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/products')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleListProducts, { auth: true }),
      POST: withAuthOrRole(handleCreateProduct, { role: 'admin' }),
    },
  },
});
