import { showToast, showModal } from '../app.js';

let productsList = [];
let reviewOrdersList = [];
let ambiguousItemsList = [];

export function render() {
  setTimeout(() => {
    loadReviewData();
  }, 0);

  return `
    <div style="display: flex; flex-direction: column; gap: 2.5rem;">
      
      <!-- 1. Flagged Cancelled / Stuck Orders Section -->
      <div class="section-card">
        <div class="section-header">
          <h2>Cancelled & Stuck Orders (Needs Review)</h2>
          <button id="btn-refresh-review" class="btn btn-secondary btn-sm">🔄 Refresh</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer & Expedition</th>
                <th>Raw Product Name</th>
                <th>Qty</th>
                <th>Courier Status</th>
                <th>Seeded Items Split</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="cancelled-orders-table-body">
              <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted)">Loading flagged orders...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. Ambiguous Items Section -->
      <div class="section-card">
        <div class="section-header">
          <h2>Ambiguous Product Names (Awaiting Mapping)</h2>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Raw Name from Excel</th>
                <th>Order Date</th>
                <th>Suggest Quantity</th>
                <th>Select Catalog Mapping</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="ambiguous-orders-table-body">
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted)">Loading ambiguous items...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Main load trigger
async function loadReviewData() {
  // Fetch products first so we can map dropdown options
  try {
    const pRes = await fetch('/api/products');
    if (pRes.ok) {
      productsList = await pRes.json();
    }
    
    await Promise.all([
      fetchReviewOrders(),
      fetchAmbiguousItems()
    ]);
    
    // Bind refresh button
    const refreshBtn = document.getElementById('btn-refresh-review');
    if (refreshBtn) {
      refreshBtn.onclick = loadReviewData;
    }
  } catch (err) {
    console.error(err);
  }
}

// Fetch review orders
async function fetchReviewOrders() {
  const tbody = document.getElementById('cancelled-orders-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/review/orders');
    if (!res.ok) throw new Error();
    reviewOrdersList = await res.json();
    renderReviewOrders(reviewOrdersList);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger)">Connection error loading review orders</td></tr>`;
  }
}

// Fetch ambiguous items
async function fetchAmbiguousItems() {
  const tbody = document.getElementById('ambiguous-orders-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/review/ambiguous');
    if (!res.ok) throw new Error();
    ambiguousItemsList = await res.json();
    renderAmbiguousItems(ambiguousItemsList);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger)">Connection error loading ambiguous items</td></tr>`;
  }
}

// Render review orders table
function renderReviewOrders(orders) {
  const tbody = document.getElementById('cancelled-orders-table-body');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted)">No flagged orders require review. Good job!</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    // Generate inner splits description
    const splitsHtml = o.items.map(item => `
      <div style="font-size: 0.8rem; margin-bottom: 0.25rem;">
        <strong>${item.quantity}x</strong> ${escapeHtml(item.product_name)} 
        ${item.is_confirmed === 0 ? '<span class="status-tag warning" style="font-size: 0.6rem; padding: 0.1rem 0.25rem;">Unmapped</span>' : ''}
      </div>
    `).join('') || '<span style="color: var(--danger); font-size: 0.8rem;">No items mapped!</span>';

    return `
      <tr>
        <td style="font-family: monospace; font-size: 0.85rem; font-weight: 600;">${escapeHtml(o.order_id)}</td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 500;">${escapeHtml(o.customer_name || 'Anonymous')}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(o.expedition || 'Unknown Courier')}</div>
        </td>
        <td style="font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(o.product_name_raw)}">
          ${escapeHtml(o.product_name_raw)}
        </td>
        <td style="font-weight: 600;">${o.quantity}</td>
        <td><span class="status-tag warning">${escapeHtml(o.order_status)}</span></td>
        <td>${splitsHtml}</td>
        <td>
          <button class="btn btn-primary btn-sm btn-resolve-order" data-id="${o.id}" data-order-id="${o.order_id}">⚠️ Resolve</button>
        </td>
      </tr>
    `;
  }).join('');

  // Setup click triggers
  tbody.querySelectorAll('.btn-resolve-order').forEach(btn => {
    btn.onclick = () => {
      openResolveModal(btn.dataset.id, btn.dataset.orderId);
    };
  });
}

// Render ambiguous items table
function renderAmbiguousItems(items) {
  const tbody = document.getElementById('ambiguous-orders-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted)">No ambiguous items require mapping. Excellent!</td></tr>`;
    return;
  }

  tbody.innerHTML = '';

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-size: 0.85rem;">${escapeHtml(item.order_id)}</td>
      <td style="font-size: 0.85rem; font-weight: 500; max-width: 250px;">${escapeHtml(item.original_text || item.product_name_raw)}</td>
      <td style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(item.order_date)}</td>
      <td>
        <input type="number" class="amb-qty-input" value="${item.quantity}" min="1" style="width: 70px; padding: 0.25rem; font-size: 0.85rem;">
      </td>
      <td>
        <select class="amb-product-select" style="width: 100%; max-width: 250px; padding: 0.25rem; font-size: 0.85rem; border-color: var(--warning); background-color: var(--warning-light);">
          <option value="">-- Choose matching product --</option>
          ${productsList.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.model)})</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="btn btn-primary btn-sm btn-confirm-split" data-id="${item.id}">Confirm</button>
      </td>
    `;

    const select = tr.querySelector('.amb-product-select');
    const qtyInput = tr.querySelector('.amb-qty-input');
    const btnConfirm = tr.querySelector('.btn-confirm-split');

    select.onchange = (e) => {
      if (e.target.value) {
        select.style.borderColor = '';
        select.style.backgroundColor = '';
      } else {
        select.style.borderColor = 'var(--warning)';
        select.style.backgroundColor = 'var(--warning-light)';
      }
    };

    btnConfirm.onclick = async () => {
      const productId = select.value;
      const quantity = qtyInput.value;

      if (!productId) {
        showToast('Warning', 'Please select a catalog product first', 'warning');
        return;
      }

      btnConfirm.disabled = true;
      btnConfirm.textContent = '⌛...';

      try {
        const res = await fetch('/api/review/confirm-split', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: item.id,
            product_id: parseInt(productId, 10),
            quantity: parseInt(quantity, 10) || 1
          })
        });

        if (res.ok) {
          showToast('Mapped', 'Item mapped and stock movement registered', 'success');
          loadReviewData();
        } else {
          const err = await res.json();
          showToast('Error', err.message || 'Mapping failed', 'error');
          btnConfirm.disabled = false;
          btnConfirm.textContent = 'Confirm';
        }
      } catch (err) {
        console.error(err);
        showToast('Error', 'Connection error', 'error');
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Confirm';
      }
    };

    tbody.appendChild(tr);
  });
}

// Open resolve cancelled/stuck order modal dialog
function openResolveModal(id, orderId) {
  const content = `
    <form id="modal-resolve-form" class="login-form" style="gap: 1.25rem;">
      <div style="font-size: 0.9rem; padding: 0.75rem; background-color: var(--warning-light); color: var(--warning); border-radius: var(--border-radius-sm); border: 1px solid rgba(245, 158, 11, 0.2); font-weight: 500;">
        ⚠️ Resolving cancelled order: <strong>${escapeHtml(orderId)}</strong>
      </div>
      <div class="form-group">
        <label for="resolve-type">Select Resolution Type</label>
        <select id="resolve-type" required>
          <option value="">-- Choose resolution --</option>
          <option value="returned">🔄 Returned (Items back in warehouse, no stock changes needed)</option>
          <option value="lost">❌ Lost / Gone (Items lost in transit, deduct stock permanent write-off)</option>
          <option value="investigating">⌛ Investigating (Keep flagged, update notes only)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="resolve-notes">Resolution Notes / Reason</label>
        <textarea id="resolve-notes" required placeholder="e.g. Package returned damaged, customer request, lost at J&T warehouse..." style="height: 100px;"></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
    <button type="submit" form="modal-resolve-form" class="btn btn-primary">Submit Resolution</button>
  `;

  const modalInstance = showModal(`Resolve Flagged Order`, content, footer);

  modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

  document.getElementById('modal-resolve-form').onsubmit = async (e) => {
    e.preventDefault();
    const resolution = document.getElementById('resolve-type').value;
    const notes = document.getElementById('resolve-notes').value;

    try {
      const res = await fetch('/api/review/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: parseInt(id, 10),
          resolution,
          resolution_notes: notes
        })
      });

      if (res.ok) {
        showToast('Resolved', 'Order status resolved successfully', 'success');
        modalInstance.close();
        loadReviewData();
      } else {
        const err = await res.json();
        showToast('Error', err.message || 'Failed to resolve order', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Connection error', 'error');
    }
  };
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
