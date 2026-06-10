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

let currentUser = null;

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
  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) existingModal.remove();

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

  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
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
  if (!currentUser) {
    showLoginLayout();
    return;
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
  try {
    const res = await fetch('/api/auth/me');
    if (res.status === 200) {
      currentUser = await res.json();
      showAppLayout();
      await router();
    } else {
      // Auto-login with default admin credentials for preview bypass
      const autoLoginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      
      if (autoLoginRes.ok) {
        currentUser = await autoLoginRes.json();
        showAppLayout();
        await router();
      } else {
        currentUser = null;
        showLoginLayout();
      }
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    currentUser = null;
    showLoginLayout();
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

// App initialization
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
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

  // Connection listener
  window.addEventListener('online', () => {
    const status = document.getElementById('connection-status');
    status.textContent = 'Online';
    status.className = 'status-indicator online';
    showToast('Connected', 'You are back online', 'success');
  });
  
  window.addEventListener('offline', () => {
    const status = document.getElementById('connection-status');
    status.textContent = 'Offline';
    status.className = 'status-indicator danger';
    showToast('Connection Lost', 'You are working offline', 'error');
  });
});
