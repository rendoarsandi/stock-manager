import { showToast, addWsListener } from '../app.js';

export function render() {
  setTimeout(() => {
    fetchLedger();
  }, 0);

  return `
    <div class="section-card">
      <div class="section-header">
        <h2>Stock Movement Ledger</h2>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Quantity Change</th>
              <th>Type</th>
              <th>Reference</th>
              <th>User</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="stock-ledger-table-body">
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted)">Loading ledger history...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function fetchLedger() {
  const tbody = document.getElementById('stock-ledger-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/products/ledger');
    if (!res.ok) throw new Error('Failed to fetch stock ledger');
    const ledger = await res.json();
    renderLedgerTable(ledger);
  } catch (err) {
    console.error("Error loading ledger:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--danger)">
          Failed to load stock ledger. Connection error.
        </td>
      </tr>
    `;
    showToast('Error', 'Failed to load stock ledger', 'error');
  }
}

function renderLedgerTable(ledger) {
  const tbody = document.getElementById('stock-ledger-table-body');
  if (!tbody) return;

  if (ledger.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted)">
          No stock movements recorded yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ledger.map(row => {
    const change = parseInt(row.quantity_change, 10);
    const changeText = change > 0 ? `+${change}` : `${change}`;
    
    let tagClass = 'info';
    let typeLabel = row.movement_type;

    if (row.movement_type === 'initial') {
      tagClass = 'success';
      typeLabel = 'Initial';
    } else if (row.movement_type === 'return') {
      tagClass = 'success';
      typeLabel = 'Return';
    } else if (row.movement_type === 'sale') {
      tagClass = 'danger';
      typeLabel = 'Sale';
    } else if (row.movement_type === 'write_off') {
      tagClass = 'warning';
      typeLabel = 'Write-Off';
    } else if (row.movement_type === 'manual_adjust') {
      tagClass = change >= 0 ? 'success' : 'danger';
      typeLabel = 'Adjustment';
    }

    const productName = row.name ? `${row.name} (${row.model || ''})` : `Product #${row.product_id}`;
    const username = row.username || 'System';
    const cleanStr = typeof row.created_at === 'string' && !row.created_at.includes('T') ? row.created_at.replace(/-/g, '/') : row.created_at;
    const dateStr = new Date(cleanStr).toLocaleString();

    return `
      <tr>
        <td>${row.id}</td>
        <td><strong>${productName}</strong></td>
        <td>
          <span style="font-weight: bold; color: var(--${tagClass === 'success' ? 'success' : tagClass === 'danger' ? 'danger' : 'warning'})">
            ${changeText}
          </span>
        </td>
        <td>
          <span class="status-tag ${tagClass}">
            ${typeLabel}
          </span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.9rem;">${row.reference || '-'}</td>
        <td>${username}</td>
        <td>${dateStr}</td>
      </tr>
    `;
  }).join('');
}

// Register WebSocket Listener to update ledger in real-time
addWsListener((message) => {
  const { type } = message;
  if (type === 'MOVEMENT_CREATED') {
    fetchLedger();
  }
});

// Register event listener for automatic connection resync
window.addEventListener('resync-data', () => {
  if (document.getElementById('stock-ledger-table-body')) {
    fetchLedger();
  }
});

