import { showToast, navigateTo } from '../app.js';

let templatesList = [];
let productsList = [];
let currentPreviewSession = null;
let currentPreviewOrders = [];

export function render() {
  setTimeout(() => {
    loadTemplatesAndProducts();
    setupImportForm();
  }, 0);

  return `
    <div style="display: flex; flex-direction: column; gap: 2rem;">
      <!-- Upload Section -->
      <div class="section-card" id="upload-section">
        <div class="section-header">
          <h2>Upload Sales Excel</h2>
        </div>
        <form id="import-form" style="display: flex; flex-direction: column; gap: 1.25rem; max-width: 500px;">
          <div class="form-group">
            <label for="import-template-select">Select E-commerce Template</label>
            <select id="import-template-select" required>
              <option value="">-- Loading templates --</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="excel-file-input">Select Excel File (.xlsx, .xls)</label>
            <input type="file" id="excel-file-input" accept=".xlsx, .xls" required>
          </div>
          
          <button type="submit" class="btn btn-primary" style="justify-content: center; align-self: flex-start;">
            📥 Upload and Preview
          </button>
        </form>
      </div>

      <!-- Preview Section (Hidden by default) -->
      <div id="import-preview-section" class="section-card hidden">
        <div class="section-header">
          <h2>Import Preview</h2>
          <div class="actions-cell">
            <button id="btn-discard-import" class="btn btn-secondary">Discard</button>
            <button id="btn-confirm-import" class="btn btn-primary">Confirm & Apply Stock</button>
          </div>
        </div>

        <!-- Summary Statistics -->
        <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 1.5rem; gap: 1rem;">
          <div class="card" style="padding: 1rem;">
            <div class="card-title" style="font-size: 0.75rem;">Total Orders</div>
            <div class="card-value" id="stat-total" style="font-size: 1.5rem;">0</div>
          </div>
          <div class="card" style="padding: 1rem;">
            <div class="card-title" style="font-size: 0.75rem;">Cancelled (Flags Review)</div>
            <div class="card-value" id="stat-cancelled" style="font-size: 1.5rem; color: var(--warning);">0</div>
          </div>
          <div class="card" style="padding: 1rem;">
            <div class="card-title" style="font-size: 0.75rem;">Duplicates Found</div>
            <div class="card-value" id="stat-duplicates" style="font-size: 1.5rem; color: var(--danger);">0</div>
          </div>
        </div>

        <!-- Preview Table -->
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">Apply</th>
                <th>Order ID</th>
                <th>Raw Product Name</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Expedition</th>
                <th>Suggested Product Split & Mapping</th>
              </tr>
            </thead>
            <tbody id="preview-table-body">
              <!-- Dynamically populated rows -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Load templates and product catalog for split mappings
async function loadTemplatesAndProducts() {
  const select = document.getElementById('import-template-select');
  if (!select) return;

  try {
    // 1. Fetch Templates
    const tRes = await fetch('/api/import/templates');
    if (!tRes.ok) throw new Error();
    templatesList = await tRes.json();
    
    select.innerHTML = '<option value="">-- Select template --</option>' + 
      templatesList.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');

    // 2. Fetch Products for mapping select boxes
    const pRes = await fetch('/api/products');
    if (pRes.ok) {
      productsList = await pRes.json();
    }
  } catch (err) {
    console.error("Load templates failed:", err);
    select.innerHTML = '<option value="">Error loading templates</option>';
    showToast('Error', 'Failed to initialize import page data', 'error');
  }
}

// Setup file submit and upload logic
function setupImportForm() {
  const form = document.getElementById('import-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const templateId = document.getElementById('import-template-select').value;
    const fileInput = document.getElementById('excel-file-input');
    const file = fileInput.files[0];

    if (!templateId || !file) {
      showToast('Warning', 'Please select a template and Excel file', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('template_id', templateId);
    formData.append('file', file);

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⌛ Parsing file...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to parse file');
      }

      const data = await res.json();
      currentPreviewSession = data.session_id;
      currentPreviewOrders = data.orders;

      showToast('Parsed', 'Excel parsed. Review the preview below.', 'success');
      renderPreview(data);

    } catch (err) {
      console.error(err);
      showToast('Upload Failed', err.message, 'error');
    } finally {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  };
}

// Render the preview table and summary stats
function renderPreview(data) {
  const previewSection = document.getElementById('import-preview-section');
  const tbody = document.getElementById('preview-table-body');
  
  if (!previewSection || !tbody) return;

  // Set stats
  document.getElementById('stat-total').textContent = data.total_rows;
  document.getElementById('stat-cancelled').textContent = data.flagged_rows;
  
  const duplicateCount = data.orders.filter(o => o.is_duplicate).length;
  document.getElementById('stat-duplicates').textContent = duplicateCount;

  // Render rows
  tbody.innerHTML = '';
  
  data.orders.forEach((order, index) => {
    const tr = document.createElement('tr');
    if (order.is_duplicate) {
      tr.style.backgroundColor = 'var(--danger-light)';
    }

    // Set order metadata columns
    let statusTagClass = 'info';
    let statusText = order.order_status;
    if (order.system_status === 'needs_review') {
      statusTagClass = 'warning';
      statusText = `${order.order_status} (Cancel Flag)`;
    }

    tr.innerHTML = `
      <td style="text-align: center; vertical-align: top;">
        <input type="checkbox" class="order-apply-checkbox" data-index="${index}" ${order.is_duplicate ? '' : 'checked'}>
      </td>
      <td style="vertical-align: top; font-family: monospace; font-size: 0.8rem;">
        ${escapeHtml(order.order_id)}
        ${order.is_duplicate ? '<br><span class="status-tag danger" style="font-size: 0.65rem; margin-top: 0.25rem;">Duplicate</span>' : ''}
      </td>
      <td style="vertical-align: top; font-size: 0.85rem;">${escapeHtml(order.product_name_raw)}</td>
      <td style="vertical-align: top; font-weight: 600;">${order.quantity}</td>
      <td style="vertical-align: top;"><span class="status-tag ${statusTagClass}">${statusText}</span></td>
      <td style="vertical-align: top; font-size: 0.85rem;">${escapeHtml(order.expedition)}</td>
      <td class="splits-container-cell" style="vertical-align: top;">
        <!-- Splits list goes here -->
      </td>
    `;

    // Render splits sub-editor in the last cell
    const splitsCell = tr.querySelector('.splits-container-cell');
    renderSplitsEditor(splitsCell, order.splits, index);

    tbody.appendChild(tr);
  });

  // Display the preview block and scroll down to it
  previewSection.classList.remove('hidden');
  previewSection.scrollIntoView({ behavior: 'smooth' });

  // Setup preview actions
  document.getElementById('btn-discard-import').onclick = discardImport;
  document.getElementById('btn-confirm-import').onclick = confirmImport;
}

// Render splits editor block (drop-downs + inputs)
function renderSplitsEditor(container, splits, orderIndex) {
  container.innerHTML = '';
  
  if (!splits || splits.length === 0) {
    container.innerHTML = '<span style="color: var(--danger); font-size: 0.8rem;">No items mapped!</span>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '0.5rem';

  splits.forEach((split, splitIndex) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '0.5rem';

    // 1. Quantity Input
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.value = split.quantity;
    qtyInput.min = '1';
    qtyInput.style.width = '60px';
    qtyInput.style.padding = '0.2rem';
    qtyInput.style.fontSize = '0.8rem';
    qtyInput.onchange = (e) => {
      currentPreviewOrders[orderIndex].splits[splitIndex].quantity = parseInt(e.target.value, 10) || 1;
    };

    // 2. Product Selector Drop-down
    const select = document.createElement('select');
    select.style.flex = '1';
    select.style.padding = '0.2rem';
    select.style.fontSize = '0.8rem';
    select.required = true;

    // Create options listing all catalog products
    let optionsHtml = `<option value="">-- Map Product --</option>`;
    productsList.forEach(p => {
      const isSelected = p.id === split.product_id ? 'selected' : '';
      optionsHtml += `<option value="${p.id}" ${isSelected}>${escapeHtml(p.name)} (${escapeHtml(p.model)})</option>`;
    });
    select.innerHTML = optionsHtml;

    // Add color border highlight if product is unmatched
    if (!split.product_id) {
      select.style.borderColor = 'var(--warning)';
      select.style.backgroundColor = 'var(--warning-light)';
    }

    select.onchange = (e) => {
      const pId = parseInt(e.target.value, 10) || null;
      const selectedProd = productsList.find(p => p.id === pId);
      
      currentPreviewOrders[orderIndex].splits[splitIndex].product_id = pId;
      currentPreviewOrders[orderIndex].splits[splitIndex].product_name = selectedProd ? selectedProd.name : '';
      
      // Update styling back to normal if matched
      if (pId) {
        select.style.borderColor = '';
        select.style.backgroundColor = '';
      } else {
        select.style.borderColor = 'var(--warning)';
        select.style.backgroundColor = 'var(--warning-light)';
      }
    };

    // 3. Delete Split button (if more than 1 split)
    row.appendChild(qtyInput);
    row.appendChild(select);
    
    if (splits.length > 1) {
      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-danger btn-sm';
      btnDel.style.padding = '0.15rem 0.3rem';
      btnDel.textContent = '❌';
      btnDel.onclick = () => {
        currentPreviewOrders[orderIndex].splits.splice(splitIndex, 1);
        renderSplitsEditor(container, currentPreviewOrders[orderIndex].splits, orderIndex);
      };
      row.appendChild(btnDel);
    }

    wrapper.appendChild(row);
  });

  // 4. Add Split link
  const addLink = document.createElement('a');
  addLink.href = '#';
  addLink.style.fontSize = '0.75rem';
  addLink.style.color = 'var(--accent-color)';
  addLink.style.textDecoration = 'none';
  addLink.style.fontWeight = '500';
  addLink.textContent = '➕ Add another split item';
  addLink.onclick = (e) => {
    e.preventDefault();
    currentPreviewOrders[orderIndex].splits.push({
      product_id: null,
      product_name: '',
      quantity: 1,
      parse_source: 'auto_split',
      original_text: currentPreviewOrders[orderIndex].product_name_raw
    });
    renderSplitsEditor(container, currentPreviewOrders[orderIndex].splits, orderIndex);
  };
  
  wrapper.appendChild(addLink);
  container.appendChild(wrapper);
}

// Discard/Cancel Import Session
async function discardImport() {
  if (!currentPreviewSession) return;
  if (!confirm("Are you sure you want to discard this preview and cancel the import?")) return;

  try {
    await fetch('/api/import/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: currentPreviewSession })
    });
    
    resetPreviewState();
    showToast('Discarded', 'Import session cancelled', 'info');
  } catch (err) {
    console.error(err);
  }
}

// Submit adjusted items and apply imports
async function confirmImport() {
  if (!currentPreviewSession) return;

  // 1. Gather all checked rows
  const checkboxes = document.querySelectorAll('.order-apply-checkbox:checked');
  if (checkboxes.length === 0) {
    showToast('Warning', 'No orders selected to import', 'warning');
    return;
  }

  const selectedOrdersToSubmit = [];
  let hasUnmappedProducts = false;

  checkboxes.forEach(cb => {
    const idx = parseInt(cb.dataset.index, 10);
    const order = currentPreviewOrders[idx];

    // Check if splits are completely mapped to products
    order.splits.forEach(s => {
      if (!s.product_id) {
        hasUnmappedProducts = true;
      }
    });

    selectedOrdersToSubmit.push(order);
  });

  if (hasUnmappedProducts) {
    showToast('Error', 'Please resolve all highlighted yellow dropdowns to map products before importing', 'error');
    return;
  }

  const btnConfirm = document.getElementById('btn-confirm-import');
  const originalText = btnConfirm.textContent;
  btnConfirm.textContent = '⌛ Applying changes...';
  btnConfirm.disabled = true;

  try {
    const res = await fetch('/api/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentPreviewSession,
        orders: selectedOrdersToSubmit
      })
    });

    if (res.ok) {
      const result = await res.json();
      showToast('Import Complete', `Applied ${result.applied_rows} orders. ${result.flagged_rows} need review.`, 'success');
      resetPreviewState();
      // Redirect to review page if there are flagged orders, otherwise to dashboard
      if (result.flagged_rows > 0) {
        navigateTo('/review');
      } else {
        navigateTo('/');
      }
    } else {
      const err = await res.json();
      showToast('Import Failed', err.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error', 'Connection error', 'error');
  } finally {
    btnConfirm.textContent = originalText;
    btnConfirm.disabled = false;
  }
}

// Reset UI state
function resetPreviewState() {
  currentPreviewSession = null;
  currentPreviewOrders = [];
  document.getElementById('excel-file-input').value = '';
  document.getElementById('import-template-select').value = '';
  document.getElementById('import-preview-section').classList.add('hidden');
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
