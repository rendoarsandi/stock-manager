import { showToast, showModal } from '../app.js';

let productsList = [];

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
        <button id="btn-add-product" class="btn btn-primary">➕ Add Product</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Model</th>
              <th>Stock</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="products-table-body">
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted)">Loading products...</td>
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
    renderProductsTable(productsList);
  } catch (err) {
    console.error("Error loading products:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--danger)">
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
        <td colspan="7" style="text-align: center; color: var(--text-muted)">
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
        <td style="font-weight: 500;">${escapeHtml(p.name)}</td>
        <td><span class="status-tag info">${escapeHtml(p.model)}</span></td>
        <td style="font-weight: 600; font-size: 1rem;">${p.current_stock}</td>
        <td>${p.low_stock_threshold}</td>
        <td><span class="status-tag ${statusClass}">${statusText}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm btn-adjust" data-id="${p.id}" data-name="${p.name}">🔢 Adjust</button>
            <button class="btn btn-secondary btn-sm btn-edit" data-id="${p.id}">✏️ Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Setup click events for page-level actions
function setupEventListeners() {
  const btnAdd = document.getElementById('btn-add-product');
  if (btnAdd) {
    btnAdd.onclick = openAddProductModal;
  }

  const tbody = document.getElementById('products-table-body');
  if (tbody) {
    tbody.onclick = (e) => {
      const adjustBtn = e.target.closest('.btn-adjust');
      const editBtn = e.target.closest('.btn-edit');

      if (adjustBtn) {
        const id = adjustBtn.dataset.id;
        const name = adjustBtn.dataset.name;
        openAdjustStockModal(id, name);
      } else if (editBtn) {
        const id = editBtn.dataset.id;
        openEditProductModal(id);
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
        <label for="p-model">Model/Variant Name</label>
        <input type="text" id="p-model" required placeholder="e.g. Model A">
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
        <label for="p-edit-model">Model/Variant Name</label>
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

// Simple HTML escaping helper to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
