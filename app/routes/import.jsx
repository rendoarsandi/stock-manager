import { createFileRoute } from '@tanstack/react-router';
import Import from '../pages/Import';

export const Route = createFileRoute('/import')({
  component: Import,
});
