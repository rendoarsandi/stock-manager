import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function CompleteRegistration() {
  const { clerkDetails, registerLocalUser, logout } = useAuth();
  const [username, setUsername] = useState(
    clerkDetails?.username || 
    (clerkDetails?.firstName || '') + (clerkDetails?.lastName || '') || 
    ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username.trim()) {
      setError("Username cannot be empty");
      setLoading(false);
      return;
    }

    const result = await registerLocalUser(username.trim());
    setLoading(false);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.message || "Failed to register local profile");
    }
  };

  return (
    <div className="login-layout">
      <div className="login-card" style={{ maxWidth: '450px' }}>
        <div className="login-header">
          <span className="login-logo" role="img" aria-label="party popper" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🎉</span>
          <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Account Created!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.4' }}>
            Your authentication details are verified.
            To complete your registration for <strong>StockManager</strong>, please choose a workspace username.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error-message">{error}</div>}
          {success && (
            <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.85rem', fontWeight: 500, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              Registration successful! Redirecting to dashboard...
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <input
              type="text"
              id="reg-username"
              required
              placeholder="Enter username"
              value={username}
              disabled={loading || success}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              This name will identify you in history logs and audits.
            </p>
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={loading || success}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px', borderTopColor: 'var(--bg-secondary)' }} />
                  Processing...
                </>
              ) : 'Complete Registration'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button 
            type="button" 
            onClick={logout} 
            className="btn"
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              padding: '0.4rem 1rem',
              cursor: 'pointer'
            }}
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
