import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { UserButton } from '@clerk/tanstack-react-start';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import Chat from './Chat';

const pageTitles = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/import': 'Import Excel',
  '/review': 'Pending Review',
  '/stock-history': 'Stock History',
  '/opname': 'Stock Opname',
  '/settings': 'Settings',
};

export default function Layout({ children }) {
  const { currentUser, logout } = useAuth();
  const { onlineCount, isConnected } = useWebSocket();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const [isMobileVisible, setIsMobileVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.pending_review_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch pending count:', err);
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    window.addEventListener('resync-data', fetchPendingCount);

    return () => {
      window.removeEventListener('resync-data', fetchPendingCount);
    };
  }, [fetchPendingCount]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isMobileVisible && !e.target.closest('.sidebar') && !e.target.closest('#sidebar-toggle')) {
        setIsMobileVisible(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobileVisible]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileVisible(false);
  }, [location.pathname]);

  const pageTitle = pageTitles[location.pathname] || 'Not Found';

  return (
    <div className="app-layout">
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileVisible ? 'visible' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-wrapper">
            <span className="logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: 'var(--text-primary)' }}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </span>
            <span className="logo-text">StockManager</span>
          </div>
          <button
            id="desktop-sidebar-toggle"
            className="desktop-toggle-btn"
            aria-label="Collapse Sidebar"
            onClick={() => {
              setIsCollapsed((prev) => {
                const next = !prev;
                localStorage.setItem('sidebar-collapsed', next);
                return next;
              });
            }}
          >
            <span className="toggle-icon">◀</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className="nav-item" activeProps={{ className: 'nav-item active' }} activeOptions={{ exact: true }} title="Dashboard">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="10" rx="1"/><rect width="7" height="5" x="3" y="15" rx="1"/></svg>
            </span>
            <span className="nav-text">Dashboard</span>
          </Link>
          <Link to="/products" className="nav-item" activeProps={{ className: 'nav-item active' }} title="Products">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </span>
            <span className="nav-text">Products</span>
          </Link>
          <Link to="/import" className="nav-item" activeProps={{ className: 'nav-item active' }} title="Import Excel">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9H8v8"/></svg>
            </span>
            <span className="nav-text">Import Excel</span>
          </Link>
          <Link to="/review" className="nav-item" activeProps={{ className: 'nav-item active' }} title="Pending Review">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <span className="nav-text">Pending Review</span>
            {pendingCount > 0 && <span id="badge-pending" className="badge">{pendingCount}</span>}
          </Link>
          <Link to="/stock-history" className="nav-item" activeProps={{ className: 'nav-item active' }} title="Stock History">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            </span>
            <span className="nav-text">Stock History</span>
          </Link>
          <Link to="/opname" className="nav-item" activeProps={{ className: 'nav-item active' }} title="Stock Opname">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
            <span className="nav-text">Stock Opname</span>
          </Link>
          <Link to="/settings" className="nav-item" activeProps={{ className: 'nav-item active' }} title="Settings">
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
            <span className="nav-text">Settings</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile" title="User Profile">
            <span className="user-avatar">
              <svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <div className="user-info">
              <div id="user-display-name" className="user-name">
                {currentUser?.username || 'Guest'}
              </div>
              <div id="user-display-role" className="user-role">
                {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : ''}
              </div>
            </div>
          </div>
          <button className="btn-logout" title="Logout" onClick={logout}>
            <span className="nav-icon">
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>

      {isMobileVisible && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsMobileVisible(false)}
        />
      )}

      <main className="main-content">
        <header className="content-header">
          <div className="header-title-container">
            <button
              id="sidebar-toggle"
              className="sidebar-toggle-btn"
              aria-label="Toggle Navigation"
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileVisible((prev) => !prev);
              }}
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
            <h1 id="page-title">{pageTitle}</h1>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span id="online-users" className="status-indicator" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: '600', fontSize: '0.8rem', borderRadius: '9999px', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid var(--border-color)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:'14px', height:'14px', color: 'var(--accent-color)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span id="online-users-count">{onlineCount}</span> online
            </span>
            <span id="connection-status" className={`status-indicator ${isConnected ? 'online' : 'danger'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
            <UserButton />
          </div>
        </header>

        <div className="content-body">
          {children}
        </div>
      </main>
      <Chat />
    </div>
  );
}
