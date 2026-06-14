import { createFileRoute } from '@tanstack/react-router';
import { handleMarkChatRead, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/chat/read')({
  server: {
    handlers: {
      POST: withAuthOrRole(handleMarkChatRead, { allowUnregistered: false, auth: true }),
    },
  },
});
