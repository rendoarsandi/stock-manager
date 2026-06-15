import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from '@tanstack/react-router';

export default function SignUpPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await signup(email, username, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', backgroundColor: 'var(--background)' }}>
      {/* Left Column: Branding / Illustration (Hidden on mobile) */}
      <div className="branding-panel" style={{
        flex: 1,
        background: 'linear-gradient(135deg, #1e1e2f 0%, #11111b 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem',
        color: '#cdd6f4',
        borderRight: '1px solid var(--border)'
      }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#a6e3a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '800', tracking: '-0.025em', color: '#cdd6f4', margin: 0 }}>StockManager</h1>
          </div>
          <p style={{ fontSize: '1.25rem', lineHeight: '1.75rem', color: '#bac2de', marginBottom: '2rem' }}>
            A modern, robust platform for managing your warehouse inventory, imports, split orders, and operations in real-time.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.875rem', fontWeight: '500' }}>
              ✓ Dynamic Drizzle ORM
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.875rem', fontWeight: '500' }}>
              ✓ BetterAuth Integration
            </div>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontSize: '0.875rem', fontWeight: '500' }}>
              ✓ Split Order Resolving
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Auth Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '2rem',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem', marginTop: 0 }}>Create an account</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Enter your details to register as a staff member</p>
            </div>

            {error && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.875rem', border: '1px solid var(--danger)' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontSize: '0.875rem', border: '1px solid var(--success)' }}>
                Account created successfully! Redirecting...
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
                placeholder="you@example.com"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
                placeholder="Choose a username"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
                placeholder="••••••••"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-color)',
                color: 'var(--bg-secondary)',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: (loading || success) ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link to="/" style={{ color: 'var(--text-primary)', fontWeight: '600', textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
