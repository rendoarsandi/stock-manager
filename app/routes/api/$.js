import { createFileRoute } from '@tanstack/react-router';
import { auth } from '../../../src/db/auth.js';

const handleSplat = async ({ request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/auth/')) {
    return auth.handler(request);
  }
  return new Response(JSON.stringify({ message: 'API Route Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: handleSplat,
      POST: handleSplat,
      PUT: handleSplat,
      DELETE: handleSplat,
      PATCH: handleSplat,
      OPTIONS: handleSplat,
      HEAD: handleSplat,
    },
  },
});

