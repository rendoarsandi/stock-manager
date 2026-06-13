import { createFileRoute } from '@tanstack/react-router';
import { app } from '../../../src/app.js';

const serve = async ({ request }) => {
  let env = globalThis.MINIMAL_CLOUDFLARE_ENV;
  let ctx = globalThis.MINIMAL_CLOUDFLARE_CTX;

  if (!env) {
    try {
      const { getEvent } = await import(/* @vite-ignore */ 'vinxi/http');
      const event = getEvent();
      const cloudflare = event?.context?.cloudflare || event?.nativeEvent?.context?.cloudflare || {};
      env = cloudflare.env;
      ctx = cloudflare;
    } catch (e) {
      console.error("Failed to retrieve Cloudflare context in API route:", e);
    }
  }

  if (!env) {
    env = process.env;
  }

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
