import { createFileRoute } from '@tanstack/react-router';
import StatusReturn from '../../pages/StatusReturn';

export const Route = createFileRoute('/products/status-return')({
  component: StatusReturn,
});
