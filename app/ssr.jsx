import { createStartHandler, defaultStreamHandler } from '@tanstack/react-router/server';
import { getRouterManifest } from '@tanstack/react-start/router-manifest';
import { createRouter } from './router';

const handler = createStartHandler({
  createRouter,
  getRouterManifest,
})(defaultStreamHandler);

export default handler;
