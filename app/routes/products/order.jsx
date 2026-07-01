import { createFileRoute } from '@tanstack/react-router';
import Order from '../../pages/Order';

export const Route = createFileRoute('/products/order')({
  component: Order,
});
