import { createFileRoute } from '@tanstack/react-router';
import Opname from '../pages/Opname';

export const Route = createFileRoute('/opname')({
  component: Opname,
});
