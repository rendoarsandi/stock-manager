import { createFileRoute } from '@tanstack/react-router';

const handleNotFound = async () => {
  return new Response(JSON.stringify({ message: 'API Route Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: handleNotFound,
      POST: handleNotFound,
      PUT: handleNotFound,
      DELETE: handleNotFound,
      PATCH: handleNotFound,
      OPTIONS: handleNotFound,
      HEAD: handleNotFound,
    },
  },
});
