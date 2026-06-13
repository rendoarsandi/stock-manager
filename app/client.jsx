import { createRoot, hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start/client';
import { createRouter } from './router';

const router = createRouter();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<StartClient router={router} />);
} else {
  hydrateRoot(document, <StartClient router={router} />);
}
