import { createFileRoute } from '@tanstack/react-router';
import SignUpPage from '../components/SignUp';

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
});
