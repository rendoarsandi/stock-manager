import { showToast, showModal } from '../app.js';

let currentUser = null;
let templatesList = [];
let usersList = [];

export function render() {
  setTimeout(() => {
    initSettings();
  }, 0);

  return `
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <div class="section-card">
        <div class="section-header">
          <h2>Import Templates Mapping</h2>
          <button id="btn-add-template" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5v14"/></svg>
            Create Template
          </button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Template Name</th>
                <th>Columns Mapped</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="templates-table-body">
              <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted)">Loading templates...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="section-card" id="user-management-section" style="display: none;">
        <div class="section-header">
          <h2>User Accounts Management</h2>
          <button id="btn-add-user" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5v14"/></svg>
            Create Account
          </button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="users-table-body">
              <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted)">Loading users...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function initSettings() {
  await fetchCurrentUser();
  await fetchTemplates();
  setupTemplateEventListeners();

  if (currentUser && currentUser.role === 'admin') {
    const userSection = document.getElementById('user-management-section');
    if (userSection) userSection.style.display = 'block';
    await fetchUsers();
    setupUserEventListeners();
  }
}

async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      currentUser = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch user in settings:", err);
  }
}

async function fetchTemplates() {
  const tbody = document.getElementById('templates-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/import/templates');
    if (!res.ok) throw new Error('Failed to fetch templates');
    templatesList = await res.json();
    renderTemplatesTable(templatesList);
  } catch (err) {
    console.error("Error loading templates:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--danger)">
          Failed to load templates. Connection error.
        </td>
      </tr>
    `;
  }
}

function renderTemplatesTable(templates) {
  const tbody = document.getElementById('templates-table-body');
  if (!tbody) return;

  if (templates.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted)">
          No templates found. Create one to get started.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = templates.map(t => {
    // Summarize mapping keys
    const mappingKeys = Object.entries(t.column_mapping)
      .map(([k, v]) => `<strong>${k}</strong> &rarr; ${v}`)
      .join(', ');

    return `
      <tr>
        <td>${t.id}</td>
        <td><strong>${escapeHtml(t.name)}</strong></td>
        <td style="font-size: 0.85rem; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(JSON.stringify(t.column_mapping))}">
          ${mappingKeys}
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm btn-edit-template" data-id="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Edit
            </button>
            <button class="btn btn-danger btn-sm btn-delete-template" data-id="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach table event listeners
  tbody.querySelectorAll('.btn-edit-template').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      const template = templatesList.find(t => t.id === id);
      if (template) openTemplateModal(template);
    };
  });

  tbody.querySelectorAll('.btn-delete-template').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      deleteTemplate(id);
    };
  });
}

function setupTemplateEventListeners() {
  const btn = document.getElementById('btn-add-template');
  if (btn) {
    btn.onclick = () => openTemplateModal();
  }
}

function openTemplateModal(template = null) {
  const isEdit = !!template;
  const title = isEdit ? 'Edit Import Template' : 'Create Import Template';
  
  const mapping = template ? {
    order_id: '',
    resi_number: '',
    product_name_raw: '',
    quantity: '',
    order_status: '',
    customer_name: '',
    expedition: '',
    order_date: '',
    price: '',
    sku_ref: '',
    ...template.column_mapping
  } : {
    order_id: '',
    resi_number: '',
    product_name_raw: '',
    quantity: '',
    order_status: '',
    customer_name: '',
    expedition: '',
    order_date: '',
    price: '',
    sku_ref: ''
  };

  const content = `
    <form id="modal-template-form" style="display: flex; flex-direction: column; gap: 1rem; max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
      ${isEdit ? `<input type="hidden" id="t-id" value="${template.id}">` : ''}
      
      <div class="form-group">
        <label for="t-name">Template Name</label>
        <input type="text" id="t-name" value="${template ? escapeHtml(template.name) : ''}" placeholder="e.g. Shopee / Tokopedia" required>
      </div>

      <h4 style="margin-top: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--accent-color);">
        Column Mapping Configuration
      </h4>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
        Enter the exact column names (headers) from your Excel spreadsheet mapping to the system fields.
      </p>

      <div class="form-group">
        <label for="m-order-id">Order ID Column (Required)</label>
        <input type="text" id="m-order-id" value="${escapeHtml(mapping.order_id)}" placeholder="e.g. No. Pesanan or Nomor Invoice" required>
      </div>

      <div class="form-group">
        <label for="m-resi-number">Resi / Tracking Number Column</label>
        <input type="text" id="m-resi-number" value="${escapeHtml(mapping.resi_number)}" placeholder="e.g. No. Resi or Nomor Resi">
      </div>

      <div class="form-group">
        <label for="m-product-name">Product Name / Description Column (Required)</label>
        <input type="text" id="m-product-name" value="${escapeHtml(mapping.product_name_raw)}" placeholder="e.g. Nama Produk" required>
      </div>

      <div class="form-group">
        <label for="m-quantity">Quantity Column (Required)</label>
        <input type="text" id="m-quantity" value="${escapeHtml(mapping.quantity)}" placeholder="e.g. Jumlah or Jumlah Produk" required>
      </div>

      <div class="form-group">
        <label for="m-order-status">Order Status Column (Required)</label>
        <input type="text" id="m-order-status" value="${escapeHtml(mapping.order_status)}" placeholder="e.g. Status Pesanan or Status Terakhir" required>
      </div>

      <div class="form-group">
        <label for="m-customer-name">Customer Username / Name Column</label>
        <input type="text" id="m-customer-name" value="${escapeHtml(mapping.customer_name)}" placeholder="e.g. Username Pembeli or Nama Pembeli">
      </div>

      <div class="form-group">
        <label for="m-expedition">Expedition / Courier Column</label>
        <input type="text" id="m-expedition" value="${escapeHtml(mapping.expedition)}" placeholder="e.g. Opsi Pengiriman or Kurir">
      </div>

      <div class="form-group">
        <label for="m-order-date">Order Date / Time Column</label>
        <input type="text" id="m-order-date" value="${escapeHtml(mapping.order_date)}" placeholder="e.g. Waktu Pembayaran or Tanggal Transaksi">
      </div>

      <div class="form-group">
        <label for="m-price">Price / Payment Column</label>
        <input type="text" id="m-price" value="${escapeHtml(mapping.price)}" placeholder="e.g. Total Pembayaran or Nilai Transaksi">
      </div>

      <div class="form-group">
        <label for="m-sku-ref">SKU Reference Column (Nomor Referensi SKU)</label>
        <input type="text" id="m-sku-ref" value="${escapeHtml(mapping.sku_ref || '')}" placeholder="e.g. Nomor Referensi SKU or SKU">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
    <button type="submit" form="modal-template-form" class="btn btn-primary">Save Template</button>
  `;

  const modalInstance = showModal(title, content, footer);

  modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

  document.getElementById('modal-template-form').onsubmit = async (e) => {
    e.preventDefault();
    
    if (currentUser.role !== 'admin') {
      showToast('Error', 'Only admins can modify templates', 'error');
      modalInstance.close();
      return;
    }

    const data = {
      name: document.getElementById('t-name').value.trim(),
      column_mapping: {
        order_id: document.getElementById('m-order-id').value.trim(),
        resi_number: document.getElementById('m-resi-number').value.trim(),
        product_name_raw: document.getElementById('m-product-name').value.trim(),
        quantity: document.getElementById('m-quantity').value.trim(),
        order_status: document.getElementById('m-order-status').value.trim(),
        customer_name: document.getElementById('m-customer-name').value.trim(),
        expedition: document.getElementById('m-expedition').value.trim(),
        order_date: document.getElementById('m-order-date').value.trim(),
        price: document.getElementById('m-price').value.trim(),
        sku_ref: document.getElementById('m-sku-ref').value.trim()
      }
    };

    if (isEdit) {
      data.id = parseInt(document.getElementById('t-id').value, 10);
    }

    try {
      const res = await fetch('/api/import/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast('Success', `Template ${isEdit ? 'updated' : 'created'} successfully`, 'success');
        modalInstance.close();
        fetchTemplates();
      } else {
        const err = await res.json();
        showToast('Error', err.message || 'Failed to save template', 'error');
      }
    } catch (err) {
      console.error("Save template error:", err);
      showToast('Error', 'Connection error. Failed to save template', 'error');
    }
  };
}

async function deleteTemplate(id) {
  if (!confirm('Are you sure you want to delete this template?')) return;

  try {
    const res = await fetch(`/api/import/templates/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast('Success', 'Template deleted successfully', 'success');
      fetchTemplates();
    } else {
      const err = await res.json();
      showToast('Error', err.message || 'Failed to delete template', 'error');
    }
  } catch (err) {
    console.error("Delete template error:", err);
    showToast('Error', 'Connection error. Failed to delete template', 'error');
  }
}

// USER MANAGEMENT HANDLERS

async function fetchUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/auth/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    usersList = await res.json();
    renderUsersTable(usersList);
  } catch (err) {
    console.error("Error loading users:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--danger)">
          Failed to load users. Connection error.
        </td>
      </tr>
    `;
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    const createdDate = new Date(u.created_at).toLocaleString();
    const isSelfOrMainAdmin = u.id === 1 || (currentUser && u.id === currentUser.id);

    return `
      <tr>
        <td>${u.id}</td>
        <td><strong>${escapeHtml(u.username)}</strong></td>
        <td>
          <span class="status-tag ${u.role === 'admin' ? 'info' : 'success'}">
            ${u.role.toUpperCase()}
          </span>
        </td>
        <td>${createdDate}</td>
        <td>
          ${isSelfOrMainAdmin 
            ? `<span style="font-size: 0.85rem; color: var(--text-muted)">Protected</span>` 
            : `<button class="btn btn-danger btn-sm btn-delete-user" data-id="${u.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>Delete</button>`
          }
        </td>
      </tr>
    `;
  }).join('');

  // Attach delete click handlers
  tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.getAttribute('data-id'), 10);
      deleteUser(id);
    };
  });
}

function setupUserEventListeners() {
  const btn = document.getElementById('btn-add-user');
  if (btn) {
    btn.onclick = () => openUserModal();
  }
}

function openUserModal() {
  const content = `
    <form id="modal-user-form" style="display: flex; flex-direction: column; gap: 1rem;">
      <div class="form-group">
        <label for="u-username">Username</label>
        <input type="text" id="u-username" placeholder="e.g. staff_john" required autocomplete="username">
      </div>

      <div class="form-group">
        <label for="u-password">Password</label>
        <input type="password" id="u-password" placeholder="Enter password" required autocomplete="new-password">
      </div>

      <div class="form-group">
        <label for="u-role">Role</label>
        <select id="u-role" required>
          <option value="staff" selected>Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary btn-cancel-modal">Cancel</button>
    <button type="submit" form="modal-user-form" class="btn btn-primary">Create User</button>
  `;

  const modalInstance = showModal('Create New User Account', content, footer);

  modalInstance.element.querySelector('.btn-cancel-modal').onclick = () => modalInstance.close();

  document.getElementById('modal-user-form').onsubmit = async (e) => {
    e.preventDefault();

    const data = {
      username: document.getElementById('u-username').value.trim(),
      password: document.getElementById('u-password').value,
      role: document.getElementById('u-role').value
    };

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        showToast('Success', 'User account created successfully', 'success');
        modalInstance.close();
        fetchUsers();
      } else {
        const err = await res.json();
        showToast('Error', err.message || 'Failed to create user account', 'error');
      }
    } catch (err) {
      console.error("Create user error:", err);
      showToast('Error', 'Connection error. Failed to create user account', 'error');
    }
  };
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user account?')) return;

  try {
    const res = await fetch(`/api/auth/users/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast('Success', 'User account deleted successfully', 'success');
      fetchUsers();
    } else {
      const err = await res.json();
      showToast('Error', err.message || 'Failed to delete user account', 'error');
    }
  } catch (err) {
    console.error("Delete user error:", err);
    showToast('Error', 'Connection error. Failed to delete user account', 'error');
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
