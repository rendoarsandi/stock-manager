import { createFileRoute } from '@tanstack/react-router';
import { app } from '../../../src/app.js';

const serve = async ({ request }) => {
  return app.fetch(request);
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
