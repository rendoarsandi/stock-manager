import { createFileRoute } from '@tanstack/react-router';
import StockHistory from '../pages/StockHistory';

export const Route = createFileRoute('/stock-history')({
  component: StockHistory,
});
