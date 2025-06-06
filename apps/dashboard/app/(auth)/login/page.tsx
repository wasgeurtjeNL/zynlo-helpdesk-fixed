// app/login/page.tsx
import { Suspense } from 'react';
import LoginPage from './LoginPage';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>Loading login...</div>}>
      <LoginPage />
    </Suspense>
  );
}
