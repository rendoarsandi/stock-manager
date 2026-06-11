import { showToast, addWsListener } from '../app.js';

export function render() {
  setTimeout(() => {
    fetchDashboardStats();
  }, 0);

  return `
    <div class="dashboard-grid">
      <!-- Card 1: Total Products -->
      <div class="card" id="card-products">
        <div class="card-title">Total Products</div>
        <div class="card-value" id="dash-total-products">...</div>
        <div class="card-subtitle">Match models registered</div>
      </div>
      <!-- Card 2: Low Stock -->
      <div class="card" id="card-low-stock">
        <div class="card-title">Low Stock Alert</div>
        <div class="card-value" id="dash-low-stock">...</div>
        <div class="card-subtitle" id="dash-low-stock-sub">Need restocking</div>
      </div>
      <!-- Card 3: Pending Cancelled Orders -->
      <div class="card" id="card-reviews">
        <div class="card-title">Pending Review</div>
        <div class="card-value" id="dash-pending-review">...</div>
        <div class="card-subtitle" id="dash-reviews-sub">Cancelled/Stuck orders</div>
      </div>
      <!-- Card 4: Ambiguous splits -->
      <div class="card" id="card-ambiguous">
        <div class="card-title">Ambiguous Items</div>
        <div class="card-value" id="dash-ambiguous">...</div>
        <div class="card-subtitle" id="dash-ambiguous-sub">Awaiting catalog mapping</div>
      </div>
    </div>

    <div class="dashboard-sections">
      <!-- Recent Reviews Table -->
      <div class="section-card">
        <div class="section-header">
          <h2>Recent Orders Awaiting Review</h2>
          <a href="/review" class="btn btn-secondary btn-sm" data-link>View All</a>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product Raw</th>
                <th>Qty</th>
                <th>Expedition</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="dash-recent-reviews">
              <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted)">Loading recent reviews...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Imports Table -->
      <div class="section-card">
        <div class="section-header">
          <h2>Recent Imports History</h2>
          <a href="/import" class="btn btn-secondary btn-sm" data-link>New Import</a>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Filename</th>
                <th>Rows</th>
              </tr>
            </thead>
            <tbody id="dash-recent-imports">
              <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted)">Loading recent imports...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Fetch stats and update UI elements
async function fetchDashboardStats() {
  try {
    const res = await fetch('/api/dashboard/stats');
    if (!res.ok) throw new Error("Failed to load dashboard statistics");

    const data = await res.json();
    updateDashboardUI(data);

  } catch (err) {
    console.error("Dashboard data load failed:", err);
    showToast('Error', 'Failed to retrieve dashboard stats', 'error');
  }
}

// Populate widgets and tables with live stats
function updateDashboardUI(data) {
  // 1. Update counter numbers
  document.getElementById('dash-total-products').textContent = data.total_products;
  document.getElementById('dash-low-stock').textContent = data.low_stock_count;
  document.getElementById('dash-pending-review').textContent = data.pending_review_count;
  document.getElementById('dash-ambiguous').textContent = data.ambiguous_count;

  // 2. Adjust colors based on flags
  const cardLowStock = document.getElementById('card-low-stock');
  const lowStockSub = document.getElementById('dash-low-stock-sub');
  if (data.low_stock_count > 0) {
    cardLowStock.style.borderLeft = '4px solid var(--danger)';
    lowStockSub.style.color = 'var(--danger)';
    lowStockSub.style.fontWeight = '500';
    lowStockSub.textContent = `⚠️ ${data.low_stock_count} items below threshold`;
  } else {
    cardLowStock.style.borderLeft = '';
    lowStockSub.style.color = 'var(--text-secondary)';
    lowStockSub.textContent = 'All stock levels healthy';
  }

  const cardReviews = document.getElementById('card-reviews');
  const reviewsSub = document.getElementById('dash-reviews-sub');
  const sidebarBadge = document.getElementById('badge-pending');
  
  if (data.pending_review_count > 0) {
    cardReviews.style.borderLeft = '4px solid var(--warning)';
    reviewsSub.style.color = 'var(--warning)';
    reviewsSub.style.fontWeight = '500';
    reviewsSub.textContent = `⚠️ ${data.pending_review_count} orders require actions`;
    
    // Sidebar badge update
    if (sidebarBadge) {
      sidebarBadge.textContent = data.pending_review_count;
      sidebarBadge.classList.remove('hidden');
    }
  } else {
    cardReviews.style.borderLeft = '';
    reviewsSub.style.color = 'var(--text-secondary)';
    reviewsSub.textContent = 'No cancelled orders pending';
    
    if (sidebarBadge) {
      sidebarBadge.classList.add('hidden');
    }
  }

  const cardAmbiguous = document.getElementById('card-ambiguous');
  const ambiguousSub = document.getElementById('dash-ambiguous-sub');
  if (data.ambiguous_count > 0) {
    cardAmbiguous.style.borderLeft = '4px solid var(--warning)';
    ambiguousSub.style.color = 'var(--warning)';
    ambiguousSub.style.fontWeight = '500';
    ambiguousSub.textContent = `⚠️ ${data.ambiguous_count} items need mapping`;
  } else {
    cardAmbiguous.style.borderLeft = '';
    ambiguousSub.style.color = 'var(--text-secondary)';
    ambiguousSub.textContent = 'Descriptions clean';
  }

  // 3. Populate Recent Reviews list
  const reviewsTbody = document.getElementById('dash-recent-reviews');
  if (reviewsTbody) {
    if (data.recent_reviews.length === 0) {
      reviewsTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No flagged orders needing review.
          </td>
        </tr>
      `;
    } else {
      reviewsTbody.innerHTML = data.recent_reviews.map(o => `
        <tr>
          <td style="font-family: monospace; font-size: 0.8rem; font-weight: 500;">${escapeHtml(o.order_id)}</td>
          <td style="font-size: 0.85rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(o.product_name_raw)}">
            ${escapeHtml(o.product_name_raw)}
          </td>
          <td style="font-weight: 600;">${o.quantity}</td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(o.expedition || '-')}</td>
          <td>
            <a href="/review" class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" data-link>Review</a>
          </td>
        </tr>
      `).join('');
    }
  }

  // 4. Populate Recent Imports list
  const importsTbody = document.getElementById('dash-recent-imports');
  if (importsTbody) {
    if (data.recent_imports.length === 0) {
      importsTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No import history found.
          </td>
        </tr>
      `;
    } else {
      importsTbody.innerHTML = data.recent_imports.map(s => {
        let statusTag = 'info';
        if (s.status === 'applied') statusTag = 'success';
        if (s.status === 'cancelled') statusTag = 'danger';

        const dateStr = s.created_at ? new Date(s.created_at.replace(/-/g, '/')).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-';

        return `
          <tr>
            <td style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</td>
            <td><span class="status-tag info" style="font-size: 0.7rem;">${escapeHtml(s.template_name)}</span></td>
            <td style="font-size: 0.85rem; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(s.filename)}">
              ${escapeHtml(s.filename)}
            </td>
            <td style="font-size: 0.85rem; font-weight: 500;">
              ${s.total_rows} rows 
              <span class="status-tag ${statusTag}" style="font-size: 0.65rem; margin-left: 0.25rem;">${s.status}</span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

// Simple HTML escaping helper
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Register WebSocket Listener to update dashboard in real-time
addWsListener((message) => {
  if (document.getElementById('dash-total-products')) {
    fetchDashboardStats();
  }
});

// Register event listener for automatic connection resync
window.addEventListener('resync-data', () => {
  if (document.getElementById('dash-total-products')) {
    fetchDashboardStats();
  }
});

