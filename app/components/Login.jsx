import React from 'react';
import { SignIn } from '@clerk/tanstack-react-start';

export default function Login() {
  return (
    <div className="login-layout">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <SignIn />
      </div>
    </div>
  );
}
