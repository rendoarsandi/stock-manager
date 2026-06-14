import { createFileRoute } from '@tanstack/react-router';
import { handleGetChatContacts, withAuthOrRole } from '../../../../src/routes_new/index.js';

export const Route = createFileRoute('/api/chat/contacts')({
  server: {
    handlers: {
      GET: withAuthOrRole(handleGetChatContacts, { allowUnregistered: false, auth: true }),
    },
  },
});
