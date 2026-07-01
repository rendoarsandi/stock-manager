import { createFileRoute } from '@tanstack/react-router';
import InOut from '../../pages/InOut';

export const Route = createFileRoute('/products/in-out')({
  component: InOut,
});
