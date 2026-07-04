import { createFileRoute } from '@tanstack/react-router';
import { auth } from '../../../../src/utils/auth.js';

const handleAuth = async ({ request }) => {
  return auth.handler(request);
};

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
      PUT: handleAuth,
      DELETE: handleAuth,
      PATCH: handleAuth,
      OPTIONS: handleAuth,
      HEAD: handleAuth,
    },
  },
});
