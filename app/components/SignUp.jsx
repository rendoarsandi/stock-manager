import React from 'react';
import { SignUp } from '@clerk/tanstack-react-start';

export default function SignUpPage() {
  return (
    <div className="login-layout">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <SignUp signInUrl="/" />
      </div>
    </div>
  );
}
