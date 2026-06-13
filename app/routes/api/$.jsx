import { createFileRoute } from '@tanstack/react-router';
import { app } from '../../../src/app.js';

const serve = async ({ request }) => {
  const env = globalThis.MINIMAL_CLOUDFLARE_ENV;
  const ctx = globalThis.MINIMAL_CLOUDFLARE_CTX;
  return app.fetch(request, env, ctx);
};

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: serve,
      POST: serve,
      PUT: serve,
      DELETE: serve,
      PATCH: serve,
      OPTIONS: serve,
      HEAD: serve,
    },
  },
});
