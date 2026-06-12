// SPA Router and App Core
const routes = {
  '/': { title: 'Dashboard', render: () => import('./pages/dashboard.js').then(m => m.render()) },
  '/products': { title: 'Products', render: () => import('./pages/products.js').then(m => m.render()) },
  '/import': { title: 'Import Excel', render: () => import('./pages/import.js').then(m => m.render()) },
  '/review': { title: 'Pending Review', render: () => import('./pages/review.js').then(m => m.render()) },
  '/stock-history': { title: 'Stock History', render: () => import('./pages/stock-history.js').then(m => m.render()) },
  '/opname': { title: 'Stock Opname', render: () => import('./pages/opname.js').then(m => m.render()) },
  '/settings': { title: 'Settings', render: () => import('./pages/settings.js').then(m => m.render()) }
};

// DEV MODE: Set default admin user immediately to prevent login flash.
// checkAuth() will update this with real data from the server.
let currentUser = { id: 1, username: 'admin', role: 'admin' };

// Toast Utility
export function showToast(title, message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Close button action
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// Modal Utility
export function showModal(title, contentHtml, footerButtonsHtml = '', onClose = null) {
  // Remove existing modal if any
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">${contentHtml}</div>
      ${footerButtonsHtml ? `<div class="modal-footer">${footerButtonsHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
    if (onClose) onClose();
  };

  overlay.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  return {
    close: closeModal,
    element: overlay
  };
}

// Navigation / Routing
export async function navigateTo(url) {
  window.history.pushState(null, null, url);
  await router();
}

async function router() {
  // DEV MODE: Always proceed — auth is handled by checkAuth on init.
  // If currentUser is somehow null, use fallback instead of blocking UI.
  if (!currentUser) {
    currentUser = { id: 1, username: 'admin', role: 'admin' };
    showAppLayout();
  }

  // Close sidebar on mobile navigation
  document.querySelector('.sidebar')?.classList.remove('visible');

  const path = window.location.pathname;
  const route = routes[path] || { title: 'Not Found', render: () => '<h2>404 - Page Not Found</h2>' };

  // Update Page Title in header
  document.getElementById('page-title').textContent = route.title;
  document.title = `Stock Manager - ${route.title}`;

  // Update active class in sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('href') === path) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Render view
  const contentBody = document.getElementById('content-body');
  
  try {
    const content = await route.render();
    if (typeof content === 'string') {
      contentBody.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      contentBody.innerHTML = '';
      contentBody.appendChild(content);
    }
    // Smoothly scroll back to the top of the content area on navigation
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    console.error("Routing error:", err);
    contentBody.innerHTML = `<div class="login-error-message">Failed to load view: ${err.message}</div>`;
  }
}

// Authentication handlers
function showLoginLayout() {
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('login-container').classList.remove('hidden');
}

function showAppLayout() {
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  
  // Update user display details
  document.getElementById('user-display-name').textContent = currentUser.username;
  document.getElementById('user-display-role').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
}

async function checkAuth() {
  // DEV MODE: Always show app layout immediately, then try to get real user data.
  showAppLayout();
  await router();

  try {
    const res = await fetch('/api/auth/me');
    if (res.status === 200) {
      const userData = await res.json();
      currentUser = userData;
      // Update display with real user data
      document.getElementById('user-display-name').textContent = currentUser.username;
      document.getElementById('user-display-role').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }
    // If /me fails, we just keep using the hardcoded admin — no login redirect
  } catch (err) {
    console.error("Auth check failed (using dev fallback):", err);
    // Keep using hardcoded admin user — never show login in dev mode
  }
}

// Login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  const errorMsg = document.getElementById('login-error');

  errorMsg.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      currentUser = await res.json();
      showAppLayout();
      showToast('Welcome!', `Logged in as ${currentUser.username}`, 'success');
      await navigateTo('/');
    } else {
      const data = await res.json();
      errorMsg.textContent = data.message || 'Invalid username or password';
      errorMsg.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Login request error:", err);
    errorMsg.textContent = 'Connection error. Please try again.';
    errorMsg.classList.remove('hidden');
  }
});

// Logout handler
document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    showLoginLayout();
    showToast('Logged Out', 'You have been successfully logged out', 'info');
  } catch (err) {
    console.error("Logout failed:", err);
  }
});

// Event delegation for links using data-link
document.body.addEventListener('click', (e) => {
  const target = e.target.closest('[data-link]');
  if (target) {
    e.preventDefault();
    navigateTo(target.getAttribute('href'));
  }
});

// Back/Forward buttons handler
window.addEventListener('popstate', router);

// WebSocket management
const wsListeners = new Set();
let socket = null;

export function addWsListener(callback) {
  wsListeners.add(callback);
  return () => {
    wsListeners.delete(callback);
  };
}

export function sendWsMessage(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  }
  return false;
}

const colors = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#e11d48', '#4f46e5', '#ca8a04'];
const localColor = colors[Math.floor(Math.random() * colors.length)];
const localSessionId = Math.random().toString(36).substring(2, 9);

function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    return;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  console.log('Connecting to WebSocket:', wsUrl);
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connection established. Syncing active page data...');
    window.dispatchEvent(new CustomEvent('resync-data'));
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle ONLINE_COUNT directly
      if (data.type === 'ONLINE_COUNT') {
        const countEl = document.getElementById('online-users-count');
        if (countEl) {
          countEl.textContent = data.count;
        }
        return;
      }
      

      console.log('WS received:', data);
      for (const listener of wsListeners) {
        try {
          listener(data);
        } catch (e) {
          console.error('Error executing WS listener:', e);
        }
      }
    } catch (err) {
      console.error('Error parsing WS message payload:', err);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed, retrying in 3 seconds...');
    socket = null;
    // Remove all remote cursors on disconnect
    document.querySelectorAll('.remote-cursor').forEach(el => el.remove());
    setTimeout(connectWebSocket, 3000);
  };

  socket.onerror = (err) => {
    console.error('WebSocket connection error:', err);
  };
}

// App initialization
window.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && localStorage.getItem('sidebar-collapsed') === 'true') {
    sidebar.classList.add('collapsed');
  }

  checkAuth();
  connectWebSocket();

  // Handle window focus to automatically reconnect WS and resync page data
  window.addEventListener('focus', () => {
    console.log('Window focused. Resyncing active page data...');
    window.dispatchEvent(new CustomEvent('resync-data'));
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }
  });

  // Desktop sidebar toggle delegation
  document.body.addEventListener('click', (e) => {
    const desktopToggle = e.target.closest('#desktop-sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (desktopToggle && sidebar) {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    }
  });
  
  // Mobile sidebar toggle delegation
  document.body.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('#sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      e.stopPropagation();
      sidebar.classList.toggle('visible');
    } else if (sidebar && sidebar.classList.contains('visible') && !sidebar.contains(e.target)) {
      sidebar.classList.remove('visible');
    }
  });

  // Global dismisser for hover ledger card when clicking outside
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.hover-ledger-trigger');
    const card = document.getElementById('hover-ledger-card');
    if (card && card.classList.contains('visible')) {
      if (!trigger && !card.contains(e.target)) {
        card.classList.remove('visible');
        card.dataset.currentId = '';
      }
    }
  });

  // Connection listener
  window.addEventListener('online', () => {
    const status = document.getElementById('connection-status');
    status.textContent = 'Online';
    status.className = 'status-indicator online';
    showToast('Connected', 'You are back online', 'success');
    window.dispatchEvent(new CustomEvent('resync-data'));
    connectWebSocket();
  });
  
  window.addEventListener('offline', () => {
    const status = document.getElementById('connection-status');
    status.textContent = 'Offline';
    status.className = 'status-indicator danger';
    showToast('Connection Lost', 'You are working offline', 'error');
  });

});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

