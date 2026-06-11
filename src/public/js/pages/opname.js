import { showToast, showModal, addWsListener } from '../app.js';

let opnamesList = [];
let currentUser = null;

export function render() {
  setTimeout(() => {
    fetchCurrentUser();
    fetchOpnames();
    setupEventListeners();
  }, 0);

  return `
    <div class="section-card">
      <div class="section-header">
        <h2>Stock Opname (Physical Inventory Audit)</h2>
        <button id="btn-new-opname" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5v14"/></svg>
          New Stock Opname
        </button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Opname ID</th>
              <th>Date</th>
              <th>User</th>
              <th>Notes</th>
              <th>Items Counted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="opname-table-body">
            <tr>
              <td colspan="6" style="text-align: center; color: var(--text-muted)">Loading reports...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      currentUser = await res.json();
    }
  } catch (err) {
    console.error("Error fetching current user:", err);
  }
}

async function fetchOpnames() {
  const tbody = document.getElementById('opname-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/stock/opname');
    if (!res.ok) throw new Error('Failed to fetch stock opname entries');

    opnamesList = await res.json();
    renderOpnamesTable(opnamesList);
  } catch (err) {
    console.error("Error loading opname entries:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--danger)">
          Failed to load stock opnames. Connection error.
        </td>
      </tr>
    `;
    showToast('Error', 'Failed to load stock opname history', 'error');
  }
}

function renderOpnamesTable(list) {
  const tbody = document.getElementById('opname-table-body');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted)">
          No stock opname records found. Click "New Stock Opname" to start.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td><strong>#${item.id}</strong></td>
      <td>${formatDate(item.created_at)}</td>
      <td><span class="status-tag info">${escapeHtml(item.username || 'Unknown')}</span></td>
      <td><span style="font-size: 0.9rem; color: var(--text-secondary);">${escapeHtml(item.notes || '-')}</span></td>
      <td><span class="status-tag success">${item.items_count} products</span></td>
      <td>
        <button class="btn btn-secondary btn-sm btn-view-details" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          View Details
        </button>
      </td>
    </tr>
  `).join('');
}

function setupEventListeners() {
  const btnNew = document.getElementById('btn-new-opname');
  if (btnNew) {
    btnNew.onclick = openNewOpnameModal;
  }

  const tbody = document.getElementById('opname-table-body');
  if (tbody) {
    tbody.onclick = (e) => {
      const viewBtn = e.target.closest('.btn-view-details');
      if (viewBtn) {
        const id = viewBtn.dataset.id;
        openViewDetailsModal(id);
      }
    };
  }
}

async function openViewDetailsModal(id) {
  try {
    const res = await fetch(`/api/stock/opname/${id}`);
    if (!res.ok) throw new Error('Failed to load opname details');

    const report = await res.json();

    const contentHtml = `
      <div class="print-report-container">
        <div class="print-header" style="margin-bottom: 1.5rem;">
          <h2 class="print-only-title" style="display: none; margin-bottom: 0.5rem; border-bottom: 2px solid var(--text-primary); padding-bottom: 0.5rem;">STOCK OPNAME REPORT</h2>
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 0.5rem; font-size: 0.95rem;">
            <strong>Opname ID:</strong> <span>#${report.id}</span>
            <strong>Date:</strong> <span>${formatDate(report.created_at)}</span>
            <strong>User:</strong> <span>${escapeHtml(report.username || 'Unknown')}</span>
            <strong>Notes:</strong> <span>${escapeHtml(report.notes || '-')}</span>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th style="text-align: right;">System Stock</th>
                <th style="text-align: right;">Physical Stock</th>
                <th style="text-align: right;">Variance</th>
              </tr>
            </thead>
            <tbody>
              ${report.items.map(item => {
                const varVal = item.variance;
                const varText = varVal > 0 ? `+${varVal}` : `${varVal}`;
                let varStyle = 'font-weight: 600; text-align: right;';
                if (varVal > 0) {
                  varStyle += ' color: var(--success);';
                } else if (varVal < 0) {
                  varStyle += ' color: var(--danger);';
                } else {
                  varStyle += ' color: var(--text-secondary);';
                }
                return `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td><span class="status-tag info">${escapeHtml(item.model)}</span></td>
                    <td style="text-align: right;">${item.system_stock}</td>
                    <td style="text-align: right;">${item.physical_stock}</td>
                    <td style="${varStyle}">${varText}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const footerButtonsHtml = `
      <button class="btn btn-secondary btn-close-modal">Close</button>
      <button class="btn btn-primary btn-print-report">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
        Print Report
      </button>
    `;

    const modalInstance = showModal(`Stock Opname Report #${report.id}`, contentHtml, footerButtonsHtml);

    modalInstance.element.querySelector('.btn-close-modal').onclick = () => modalInstance.close();
    
    modalInstance.element.querySelector('.btn-print-report').onclick = () => {
      window.print();
    };

  } catch (err) {
    console.error(err);
    showToast('Error', 'Failed to retrieve details', 'error');
  }
}

async function openNewOpnameModal() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to load products');
    const products = await res.json();

    if (products.length === 0) {
      showToast('Warning', 'No products available to audit', 'warning');
      return;
    }

    const contentHtml = `
      <form id="new-opname-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <div class="form-group">
          <label for="opname-notes">Audit Notes</label>
          <textarea id="opname-notes" placeholder="Enter notes for this audit (e.g. Weekly physical stock count)"></textarea>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="font-weight: 600; font-size: 0.95rem;">Product Physical Counts</div>
          <input type="text" id="opname-search-input" class="form-input" placeholder="🔍 Search product name or SKU..." style="max-width: 300px; padding: 0.35rem 0.5rem; font-size: 0.8rem; margin-bottom: 0;">
        </div>
        <div class="table-wrapper" style="max-height: 350px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>Product Name (SKU)</th>
                <th style="text-align: right; width: 100px;">System</th>
                <th style="text-align: right; width: 120px;">Physical Count</th>
              </tr>
            </thead>
            <tbody id="opname-modal-table-body">
              ${products.map(p => `
                <tr class="opname-product-row" data-product-id="${p.id}" data-search-term="${escapeHtml(p.name.toLowerCase())} ${escapeHtml(p.model.toLowerCase())}">
                  <td>
                    <div style="font-weight: 500;">${escapeHtml(p.name)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(p.model)}</div>
                  </td>
                  <td style="text-align: right; font-weight: 500;">${p.current_stock}</td>
                  <td style="text-align: right;">
                    <input type="number" class="physical-stock-input form-input" 
                      style="width: 100px; padding: 0.25rem 0.5rem; text-align: right;" 
                      min="0" required value="${p.current_stock}">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </form>
    `;

    const footerButtonsHtml = `
      <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
      <button type="submit" form="new-opname-form" class="btn btn-primary">Save Opname</button>
    `;

    const modalInstance = showModal("New Stock Opname", contentHtml, footerButtonsHtml);

    // Setup live search filter
    const searchInput = document.getElementById('opname-search-input');
    searchInput.oninput = (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = modalInstance.element.querySelectorAll('.opname-product-row');
      rows.forEach(row => {
        const rowTerm = row.dataset.searchTerm;
        if (rowTerm.includes(term)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    };

    modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

    document.getElementById('new-opname-form').onsubmit = async (e) => {
      e.preventDefault();

      const notes = document.getElementById('opname-notes').value.trim();
      const rows = modalInstance.element.querySelectorAll('.opname-product-row');
      const items = [];

      for (const row of rows) {
        const product_id = parseInt(row.dataset.productId, 10);
        const input = row.querySelector('.physical-stock-input');
        const physical_stock = parseInt(input.value, 10);

        if (isNaN(physical_stock) || physical_stock < 0) {
          showToast('Error', 'Please enter a valid non-negative physical stock count for all products', 'error');
          return;
        }

        items.push({ product_id, physical_stock });
      }

      try {
        const postRes = await fetch('/api/stock/opname', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes, items })
        });

        if (postRes.ok) {
          showToast('Success', 'Stock opname saved successfully', 'success');
          modalInstance.close();
          fetchOpnames();
        } else {
          const errData = await postRes.json();
          showToast('Error', errData.message || 'Failed to save stock opname', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error', 'Connection error', 'error');
      }
    };

  } catch (err) {
    console.error(err);
    showToast('Error', 'Failed to retrieve products for audit', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('id-ID', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

// Register WebSocket Listener to update opnames in real-time
addWsListener((message) => {
  const { type } = message;
  if (type === 'OPNAME_CREATED') {
    fetchOpnames();
  }
});

// Register event listener for automatic connection resync
window.addEventListener('resync-data', () => {
  if (document.getElementById('opname-table-body')) {
    fetchOpnames();
  }
});

