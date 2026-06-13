import { createRoot, hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start/client';
import { RouterProvider } from '@tanstack/react-router';
import { createRouter } from './router';

const router = createRouter();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<RouterProvider router={router} />);
} else {
  hydrateRoot(document, <StartClient router={router} />);
}
