import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { getRouterManifest } from '@tanstack/react-start/router-manifest';
import { createRouter } from './router';
import { createClerkHandler } from '@clerk/tanstack-react-start/server';

const handler = createStartHandler({
  createRouter,
  getRouterManifest,
})(defaultStreamHandler);

export default createClerkHandler(handler);
