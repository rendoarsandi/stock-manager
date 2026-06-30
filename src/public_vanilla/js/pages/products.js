import { showToast, showModal, addWsListener } from '../app.js';

let productsList = [];
let currentSortColumn = 'id';
let currentSortDirection = 'asc';

// Render the main page shell
export function render() {
  // We return the container and then fetch products asynchronously
  setTimeout(() => {
    fetchProducts();
    setupEventListeners();
  }, 0);

  return `
    <div class="section-card">
      <div class="section-header">
        <h2>Product List</h2>
        <button id="btn-add-product" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5v14"/></svg>
          Add Product
        </button>
      </div>
      
      <!-- Search Controls -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <div class="search-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="search-product" placeholder="Search name or SKU...">
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="sortable-header" data-column="id" style="cursor: pointer; user-select: none;">
                ID <span class="sort-icon" id="sort-icon-id"></span>
              </th>
              <th class="sortable-header" data-column="name" style="cursor: pointer; user-select: none;">
                Name <span class="sort-icon" id="sort-icon-name"></span>
              </th>
              <th class="sortable-header" data-column="master_sku" style="cursor: pointer; user-select: none;">
                Master SKU <span class="sort-icon" id="sort-icon-master_sku"></span>
              </th>
              <th class="sortable-header" data-column="sku" style="cursor: pointer; user-select: none;">
                SKU <span class="sort-icon" id="sort-icon-sku"></span>
              </th>
              <th class="sortable-header" data-column="stock" style="cursor: pointer; user-select: none;">
                Stock <span class="sort-icon" id="sort-icon-stock"></span>
              </th>
              <th class="sortable-header" data-column="threshold" style="cursor: pointer; user-select: none;">
                Threshold <span class="sort-icon" id="sort-icon-threshold"></span>
              </th>
              <th class="sortable-header" data-column="status" style="cursor: pointer; user-select: none;">
                Status <span class="sort-icon" id="sort-icon-status"></span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="products-table-body">
            <tr>
              <td colspan="8" style="text-align: center; color: var(--text-muted)">Loading products...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Fetch products from API
async function fetchProducts() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    
    productsList = await res.json();
    applyFilterAndSort();
  } catch (err) {
    console.error("Error loading products:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--danger)">
          Failed to load products. Connection error.
        </td>
      </tr>
    `;
    showToast('Error', 'Failed to load products', 'error');
  }
}

// Render product list rows into the table
function renderProductsTable(products) {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted)">
          No products registered. Click "Add Product" to create one.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    let statusClass = 'success';
    let statusText = 'Good';

    if (p.current_stock <= 0) {
      statusClass = 'danger';
      statusText = 'Out of Stock';
    } else if (p.current_stock <= p.low_stock_threshold) {
      statusClass = 'warning';
      statusText = 'Low Stock';
    }

    return `
      <tr>
        <td>${p.id}</td>
        <td class="hover-ledger-trigger" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-model="${escapeHtml(p.model)}" style="font-weight: 500; cursor: help; text-decoration: underline dotted var(--text-muted); text-underline-offset: 4px;">
          ${escapeHtml(p.name)}
        </td>
        <td><span class="status-tag info" style="background-color: var(--accent-light); color: var(--text-secondary); font-weight: 500;">${escapeHtml(p.master_sku || '-')}</span></td>
        <td><span class="status-tag info">${escapeHtml(p.model)}</span></td>
        <td style="font-weight: 600; font-size: 1rem;">${p.current_stock}</td>
        <td>${p.low_stock_threshold}</td>
        <td><span class="status-tag ${statusClass}">${statusText}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm btn-adjust" data-id="${p.id}" data-name="${p.name}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
              Adjust
            </button>
            <button class="btn btn-secondary btn-sm btn-edit" data-id="${p.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Edit
            </button>
            <button class="btn btn-danger btn-sm btn-delete" data-id="${p.id}" data-name="${escapeHtml(p.name)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Register hover ledger triggers
  const triggers = tbody.querySelectorAll('.hover-ledger-trigger');
  triggers.forEach(el => {
    el.onmouseenter = (e) => {
      if (window.matchMedia('(hover: hover)').matches) {
        const id = el.dataset.id;
        const name = el.dataset.name;
        const model = el.dataset.model;
        showHoverLedgerCard(e, id, name, model);
      }
    };
    el.onmouseleave = () => {
      if (window.matchMedia('(hover: hover)').matches) {
        hideHoverLedgerCard();
      }
    };
    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent immediate document click trigger from dismissing card
      const id = el.dataset.id;
      const name = el.dataset.name;
      const model = el.dataset.model;
      const card = document.getElementById('hover-ledger-card');
      if (card && card.classList.contains('visible') && card.dataset.currentId === id) {
        hideHoverLedgerCard();
      } else {
        showHoverLedgerCard(e, id, name, model);
      }
    };
  });
}

// Setup click events for page-level actions
function setupEventListeners() {
  const btnAdd = document.getElementById('btn-add-product');
  if (btnAdd) {
    btnAdd.onclick = openAddProductModal;
  }

  const searchInput = document.getElementById('search-product');
  if (searchInput) {
    searchInput.oninput = () => applyFilterAndSort();
  }

  const thead = document.querySelector('.table-wrapper table thead');
  if (thead) {
    thead.onclick = (e) => {
      const th = e.target.closest('.sortable-header');
      if (th) {
        const col = th.dataset.column;
        handleHeaderSort(col);
      }
    };
  }

  const tbody = document.getElementById('products-table-body');
  if (tbody) {
    tbody.onclick = (e) => {
      const adjustBtn = e.target.closest('.btn-adjust');
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');

      if (adjustBtn) {
        const id = adjustBtn.dataset.id;
        const name = adjustBtn.dataset.name;
        openAdjustStockModal(id, name);
      } else if (editBtn) {
        const id = editBtn.dataset.id;
        openEditProductModal(id);
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const name = deleteBtn.dataset.name;
        confirmDeleteProduct(id, name);
      }
    };
  }
}

// Open modal to add a new product
function openAddProductModal() {
  const content = `
    <form id="modal-product-form" class="login-form" style="gap: 1rem;">
      <div class="form-group">
        <label for="p-name">Product Name (Unique)</label>
        <input type="text" id="p-name" required placeholder="e.g. Korek Api Model A">
      </div>
      <div class="form-group">
        <label for="p-master-sku">Master SKU (Optional)</label>
        <input type="text" id="p-master-sku" placeholder="e.g. CROSUP_1S">
      </div>
      <div class="form-group">
        <label for="p-model">SKU (Reference)</label>
        <input type="text" id="p-model" required placeholder="e.g. CROBAR_1S">
      </div>
      <div class="form-group">
        <label for="p-desc">Description (Optional)</label>
        <textarea id="p-desc" placeholder="Details about branding, packaging..."></textarea>
      </div>
      <div class="form-group">
        <label for="p-stock">Initial Stock Level</label>
        <input type="number" id="p-stock" value="0" min="0">
      </div>
      <div class="form-group">
        <label for="p-threshold">Low Stock Alert Threshold</label>
        <input type="number" id="p-threshold" value="10" min="0">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
    <button type="submit" form="modal-product-form" class="btn btn-primary">Save Product</button>
  `;

  const modalInstance = showModal('Create New Product', content, footer);

  modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

  document.getElementById('modal-product-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('p-name').value,
      master_sku: document.getElementById('p-master-sku').value,
      model: document.getElementById('p-model').value,
      description: document.getElementById('p-desc').value,
      initial_stock: parseInt(document.getElementById('p-stock').value, 10) || 0,
      low_stock_threshold: parseInt(document.getElementById('p-threshold').value, 10) || 0
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast('Success', 'Product created successfully', 'success');
        modalInstance.close();
        fetchProducts();
      } else {
        const err = await res.json();
        showToast('Error', err.message || 'Failed to create product', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Connection error', 'error');
    }
  };
}

// Open modal to edit product details
function openEditProductModal(id) {
  const product = productsList.find(p => p.id == id);
  if (!product) return;

  const content = `
    <form id="modal-product-edit-form" class="login-form" style="gap: 1rem;">
      <div class="form-group">
        <label for="p-edit-name">Product Name (Unique)</label>
        <input type="text" id="p-edit-name" required value="${escapeHtml(product.name)}">
      </div>
      <div class="form-group">
        <label for="p-edit-master-sku">Master SKU</label>
        <input type="text" id="p-edit-master-sku" value="${escapeHtml(product.master_sku || '')}" placeholder="e.g. CROSUP_1S">
      </div>
      <div class="form-group">
        <label for="p-edit-model">SKU (Reference)</label>
        <input type="text" id="p-edit-model" required value="${escapeHtml(product.model)}">
      </div>
      <div class="form-group">
        <label for="p-edit-desc">Description</label>
        <textarea id="p-edit-desc">${escapeHtml(product.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label for="p-edit-threshold">Low Stock Alert Threshold</label>
        <input type="number" id="p-edit-threshold" required value="${product.low_stock_threshold}" min="0">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
    <button type="submit" form="modal-product-edit-form" class="btn btn-primary">Update Details</button>
  `;

  const modalInstance = showModal('Edit Product Details', content, footer);

  modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

  document.getElementById('modal-product-edit-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('p-edit-name').value,
      master_sku: document.getElementById('p-edit-master-sku').value,
      model: document.getElementById('p-edit-model').value,
      description: document.getElementById('p-edit-desc').value,
      low_stock_threshold: parseInt(document.getElementById('p-edit-threshold').value, 10) || 0
    };

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast('Updated', 'Product details saved', 'success');
        modalInstance.close();
        fetchProducts();
      } else {
        const err = await res.json();
        showToast('Error', err.message || 'Failed to update details', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Connection error', 'error');
    }
  };
}

// Open modal to adjust stock levels manually
function openAdjustStockModal(id, name) {
  const product = productsList.find(p => p.id == id);
  if (!product) return;

  const content = `
    <div style="margin-bottom: 1rem; padding: 0.5rem; background-color: var(--bg-primary); border-radius: var(--border-radius-sm); font-size: 0.9rem;">
      <strong>Current Stock:</strong> <span style="font-weight: 600;">${product.current_stock}</span> units
    </div>
    <form id="modal-adjust-form" class="login-form" style="gap: 1rem;">
      <div class="form-group">
        <label for="p-adjust-qty">Quantity Change</label>
        <input type="number" id="p-adjust-qty" required placeholder="Use negative numbers to subtract (e.g. -5)">
      </div>
      <div class="form-group">
        <label for="p-adjust-type">Movement Type</label>
        <select id="p-adjust-type">
          <option value="manual_adjust">Manual Adjustment</option>
          <option value="return">Return</option>
          <option value="write_off">Write Off (Loss/Damaged)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="p-adjust-ref">Reference/Reason</label>
        <input type="text" id="p-adjust-ref" required placeholder="e.g. Stock count recount, damaged box, return from J&T">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
    <button type="submit" form="modal-adjust-form" class="btn btn-primary">Save Adjustment</button>
  `;

  const modalInstance = showModal(`Adjust Stock: ${escapeHtml(name)}`, content, footer);

  modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

  document.getElementById('modal-adjust-form').onsubmit = async (e) => {
    e.preventDefault();
    const qtyChange = parseInt(document.getElementById('p-adjust-qty').value, 10);
    if (isNaN(qtyChange) || qtyChange === 0) {
      showToast('Warning', 'Quantity change cannot be zero', 'warning');
      return;
    }

    const data = {
      quantity_change: qtyChange,
      movement_type: document.getElementById('p-adjust-type').value,
      reference: document.getElementById('p-adjust-ref').value
    };

    try {
      const res = await fetch(`/api/products/${id}/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast('Success', 'Stock level adjusted', 'success');
        modalInstance.close();
        fetchProducts();
      } else {
        const err = await res.json();
        showToast('Error', err.message || 'Failed to adjust stock', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Connection error', 'error');
    }
  };
}

// Open confirmation modal to delete product
function confirmDeleteProduct(id, name) {
  const content = `
    <p style="margin-bottom: 1rem; color: var(--text-primary);">Are you sure you want to delete product <strong>${escapeHtml(name)}</strong>?</p>
    <p style="color: var(--danger); font-size: 0.85rem; font-weight: 500; margin-bottom: 0.5rem;">⚠️ This action is permanent and will delete all associated order item histories and stock movements!</p>
  `;

  const footer = `
    <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
    <button id="btn-confirm-delete" class="btn btn-danger">🗑️ Delete Product</button>
  `;

  const modalInstance = showModal('Confirm Delete Product', content, footer);

  modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

  modalInstance.element.querySelector('#btn-confirm-delete').onclick = async () => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Deleted', 'Product deleted successfully', 'success');
        modalInstance.close();
        fetchProducts();
      } else {
        const err = await res.json();
        showToast('Error', err.message || 'Failed to delete product', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Connection error', 'error');
    }
  };
}

// Simple HTML escaping helper to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showHoverLedgerCard(e, productId, name, model) {
  let card = document.getElementById('hover-ledger-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'hover-ledger-card';
    card.className = 'hover-ledger-card';
    document.body.appendChild(card);
  }

  // Populate content first so that the element has layout and can be measured
  card.innerHTML = `
    <div class="hover-card-header">
      <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(name)}</div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${escapeHtml(model)}</div>
    </div>
    <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.8rem;">
      <span class="loading-spinner"></span> Loading stock history...
    </div>
  `;

  card.classList.add('visible');

  // Measure size dynamically
  const rect = e.currentTarget.getBoundingClientRect();
  const cardWidth = card.offsetWidth || 580;
  const cardHeight = card.offsetHeight || 250;
  
  let left = rect.left;
  if (left + cardWidth > window.innerWidth) {
    left = window.innerWidth - cardWidth - 10;
  }
  if (left < 10) left = 10;

  let top = rect.bottom + window.scrollY + 8;
  if (rect.bottom + cardHeight > window.innerHeight) {
    top = rect.top + window.scrollY - cardHeight - 8;
    if (top < window.scrollY) {
      top = rect.bottom + window.scrollY + 8;
    }
  }

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;

  card.dataset.currentId = productId;

  fetch(`/api/products/${productId}/ledger`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    })
    .then(movements => {
      if (card.dataset.currentId !== productId) return;
      renderLedgerInCard(card, movements, name, model);
    })
    .catch(err => {
      if (card.dataset.currentId !== productId) return;
      card.innerHTML = `
        <div class="hover-card-header">
          <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(name)}</div>
        </div>
        <div style="padding: 1.5rem; color: var(--danger); font-size: 0.8rem; text-align: center; font-weight: 500;">
          ⚠️ Failed to load stock history
        </div>
      `;
    });
}

function hideHoverLedgerCard() {
  const card = document.getElementById('hover-ledger-card');
  if (card) {
    card.classList.remove('visible');
    card.dataset.currentId = '';
  }
}

function renderLedgerInCard(card, movements, name, model) {
  if (movements.length === 0) {
    card.innerHTML = `
      <div class="hover-card-header">
        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(name)}</div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${escapeHtml(model)}</div>
      </div>
      <div style="padding: 1.5rem; color: var(--text-secondary); font-size: 0.8rem; text-align: center;">
        No stock history recorded.
      </div>
    `;
    return;
  }

  // Sort by created_at ASC to calculate running balance chronologically
  movements.sort((a, b) => {
    const da = typeof a.created_at === 'string' && !a.created_at.includes('T') ? a.created_at.replace(/-/g, '/') : a.created_at;
    const db = typeof b.created_at === 'string' && !b.created_at.includes('T') ? b.created_at.replace(/-/g, '/') : b.created_at;
    return new Date(da) - new Date(db);
  });

  let balance = 0;
  const rowsHtml = movements.map(m => {
    const qty = m.quantity_change;
    balance += qty;
    
    const cleanStr = typeof m.created_at === 'string' && !m.created_at.includes('T') ? m.created_at.replace(/-/g, '/') : m.created_at;
    const dateObj = new Date(cleanStr);
    const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    
    let noSj = '-';
    if (m.reference) {
      const orderIdMatch = m.reference.match(/(?:Order ID:\s*)([a-zA-Z0-9\/\-]+)/i);
      if (orderIdMatch && orderIdMatch[1]) {
        noSj = orderIdMatch[1];
      } else if (m.reference.startsWith('Opname ID:')) {
        noSj = '-';
      } else {
        noSj = m.reference;
      }
    }

    let keterangan = m.movement_type.toUpperCase();
    if (m.movement_type === 'initial') {
      keterangan = 'STOCK OPNAME';
    } else if (m.movement_type === 'manual_adjust') {
      if (m.reference && m.reference.includes('Opname')) {
        keterangan = 'STOCK OPNAME';
      } else if (m.quantity_change > 0) {
        keterangan = 'BARANG MASUK';
      } else {
        keterangan = 'MANUAL ADJUST';
      }
    } else if (m.movement_type === 'sale') {
      keterangan = m.platform_name ? m.platform_name.toUpperCase() : 'SHOPEE';
    } else if (m.movement_type === 'return') {
      keterangan = 'DIRETUR';
    } else if (m.movement_type === 'write_off') {
      keterangan = 'WRITE OFF';
    }

    const masuk = qty > 0 ? qty : '';
    const keluar = qty < 0 ? Math.abs(qty) : '';

    return `
      <tr>
        <td style="text-align: center;">${dateStr}</td>
        <td style="font-family: monospace; font-size: 0.72rem;">${escapeHtml(noSj)}</td>
        <td>
          <span class="status-tag info" style="font-size: 0.65rem; padding: 0.1rem 0.35rem; display: inline-block;">
            ${escapeHtml(keterangan)}
          </span>
        </td>
        <td style="color: var(--success); font-weight: 600; text-align: center;">${masuk}</td>
        <td style="color: var(--danger); font-weight: 600; text-align: center;">${keluar}</td>
        <td style="font-weight: 600; color: var(--text-primary); text-align: center;">${balance}</td>
      </tr>
    `;
  }).join('');

  card.innerHTML = `
    <div class="hover-card-header">
      <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(name)}</div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${escapeHtml(model)}</div>
    </div>
    <div style="overflow-x: auto;">
      <table class="hover-ledger-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th rowspan="2" style="text-align: center; vertical-align: middle;">Date</th>
            <th rowspan="2" style="text-align: center; vertical-align: middle;">Ref / Order ID</th>
            <th rowspan="2" style="text-align: center; vertical-align: middle;">Description</th>
            <th colspan="2" style="text-align: center;">Stock Movement</th>
            <th rowspan="2" style="text-align: center; vertical-align: middle;">Final Stock</th>
          </tr>
          <tr>
            <th style="color: var(--success); text-align: center;">In</th>
            <th style="color: var(--danger); text-align: center;">Out</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

// Helper to get status text for a product
function getStatusText(p) {
  if (p.current_stock <= 0) return 'Out of Stock';
  if (p.current_stock <= p.low_stock_threshold) return 'Low Stock';
  return 'Good';
}

// Handle header click sorting toggle
function handleHeaderSort(column) {
  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortColumn = column;
    currentSortDirection = 'asc';
  }
  applyFilterAndSort();
}

// Update the visual arrow indicators on headers
function updateSortHeaders() {
  const columns = ['id', 'name', 'master_sku', 'sku', 'stock', 'threshold', 'status'];
  columns.forEach(col => {
    const el = document.getElementById(`sort-icon-${col}`);
    if (!el) return;
    if (currentSortColumn === col) {
      el.innerHTML = currentSortDirection === 'asc' ? ' ▲' : ' ▼';
      el.style.opacity = '1';
      el.style.color = 'var(--text-primary)';
    } else {
      el.innerHTML = ' ↕';
      el.style.opacity = '0.35';
      el.style.color = 'var(--text-secondary)';
    }
  });
}

// Apply dynamic filtering and sorting to the products list
function applyFilterAndSort() {
  const searchInput = document.getElementById('search-product');
  
  let filtered = [...productsList];
  
  if (searchInput) {
    const query = searchInput.value.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.model.toLowerCase().includes(query) ||
        (p.master_sku && p.master_sku.toLowerCase().includes(query)) ||
        p.id.toString().includes(query)
      );
    }
  }
  
  filtered.sort((a, b) => {
    let valA, valB;
    if (currentSortColumn === 'id') {
      valA = a.id;
      valB = b.id;
    } else if (currentSortColumn === 'name') {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (currentSortColumn === 'master_sku') {
      valA = (a.master_sku || '').toLowerCase();
      valB = (b.master_sku || '').toLowerCase();
    } else if (currentSortColumn === 'sku') {
      valA = a.model.toLowerCase();
      valB = b.model.toLowerCase();
    } else if (currentSortColumn === 'stock') {
      valA = a.current_stock;
      valB = b.current_stock;
    } else if (currentSortColumn === 'threshold') {
      valA = a.low_stock_threshold;
      valB = b.low_stock_threshold;
    } else if (currentSortColumn === 'status') {
      valA = getStatusText(a).toLowerCase();
      valB = getStatusText(b).toLowerCase();
    }

    if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  renderProductsTable(filtered);
  updateSortHeaders();
}

// Register WebSocket Listener to update product table in real-time
addWsListener((message) => {
  const { type, payload } = message;
  
  if (type === 'PRODUCT_CREATED') {
    if (!productsList.some(p => p.id === payload.id)) {
      productsList.push(payload);
    }
  } else if (type === 'PRODUCT_UPDATED') {
    const idx = productsList.findIndex(p => p.id === payload.id);
    if (idx !== -1) {
      productsList[idx] = { ...productsList[idx], ...payload };
    }
  } else if (type === 'PRODUCT_DELETED') {
    productsList = productsList.filter(p => p.id !== payload.id);
  } else {
    return;
  }
  
  if (document.getElementById('products-table-body')) {
    applyFilterAndSort();
  }
});

// Register event listener for automatic connection resync
window.addEventListener('resync-data', () => {
  if (document.getElementById('products-table-body')) {
    fetchProducts();
  }
});

