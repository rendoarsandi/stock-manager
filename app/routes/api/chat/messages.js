import { createFileRoute } from '@tanstack/react-router';
import { handleGetChatMessages, handleSendChatMessage, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/chat/messages')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleGetChatMessages, { allowUnregistered: false, auth: true }),
      POST: withAuthOrRole(handleSendChatMessage, { allowUnregistered: false, auth: true }),
    },
  },
});
