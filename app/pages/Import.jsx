import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { showToast } from '../utils/toast';

// Helper to parse order dates from various e-commerce formats
function parseOrderDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s === '') return null;

  // If it's already a standard timestamp/ISO format, e.g. YYYY-MM-DD...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      const parts = s.split(/[- :]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const minute = parts[4] ? parseInt(parts[4], 10) : 0;
      const second = parts[5] ? parseInt(parts[5], 10) : 0;
      return new Date(year, month, day, hour, minute, second);
    } catch (e) {
      return null;
    }
  }

  // If it is DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const [_, day, month, year, hour = '00', minute = '00', second = '00'] = dmyMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  // Handle wordy Indonesian formats, e.g. "07 Jun 2026 08:30"
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  const wordMatch = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (wordMatch) {
    const [_, day, monthWord, year, hour = '00', minute = '00', second = '00'] = wordMatch;
    const month = months[monthWord.toLowerCase().substring(0, 3)] || 0;
    return new Date(
      parseInt(year, 10),
      month,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseOpnameDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(/[- :]/);
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hour = parts[3] ? parseInt(parts[3], 10) : 0;
    const minute = parts[4] ? parseInt(parts[4], 10) : 0;
    const second = parts[5] ? parseInt(parts[5], 10) : 0;
    return new Date(year, month, day, hour, minute, second);
  }
  return null;
}

// SearchableSelect Component
function SearchableSelect({ selectedId, products, onChange, id, name }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef(null);

  const selectedProd = products.find(p => p.id === selectedId);
  const displayValue = selectedProd ? `${selectedProd.name} (${selectedProd.model})` : '';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
    (p.model || '').toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div ref={containerRef} className="searchable-select-container" style={{ position: 'relative', width: '220px' }}>
      <input
        type="text"
        id={id}
        name={name}
        className="searchable-select-input"
        placeholder="-- Map Product (Search...) --"
        style={
          !selectedId
            ? { borderColor: 'var(--warning)', backgroundColor: 'var(--warning-light)', width: '100%' }
            : { width: '100%' }
        }
        value={isOpen ? filterText : displayValue}
        onChange={(e) => setFilterText(e.target.value)}
        onFocus={() => {
          setFilterText('');
          setIsOpen(true);
        }}
      />
      {isOpen && (
        <div
          className="searchable-select-dropdown"
          style={{
            display: 'block',
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {filtered.length === 0 ? (
            <div className="searchable-select-item" style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
              No matching products
            </div>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                className={`searchable-select-item ${p.id === selectedId ? 'selected' : ''}`}
                style={{ padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}
                onMouseDown={() => {
                  onChange(p.id);
                  setIsOpen(false);
                }}
              >
                {p.name} ({p.model})
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Import() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Active Session states
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [flaggedRows, setFlaggedRows] = useState(0);

  // Filter / Sort toolbar states
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unmapped'
  const [sortUnmappedToTop, setSortUnmappedToTop] = useState(false);

  // Queries
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/import/templates');
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  // Load active session on init
  useEffect(() => {
    fetch('/api/import/active-session')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) {
          setCurrentSessionId(data.session_id);
          const mappedOrders = (data.orders || []).map((o, idx) => ({
            ...o,
            id: o.id || `${o.order_id}-${idx}`
          }));
          setCurrentOrders(mappedOrders);
          setTotalRows(data.total_rows || 0);
          setFlaggedRows(data.flagged_rows || 0);
        }
      })
      .catch((err) => console.error('Failed to load active session:', err));
  }, []);

  // Sync session changes helper
  const syncSession = async (updatedOrders) => {
    if (!currentSessionId) return;
    try {
      await fetch('/api/import/active-session/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          orders: updatedOrders,
        }),
      });
    } catch (err) {
      console.error('Sync preview orders failed:', err);
    }
  };

  // Upload handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !file) {
      showToast('Warning', 'Please select a template and Excel file', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('template_id', selectedTemplate);
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to parse file');
      }

      const data = await res.json();
      setCurrentSessionId(data.session_id);
      const rawOrders = data.orders || [];
      const ordersWithSelection = rawOrders.map((o, idx) => ({
        ...o,
        id: `${o.order_id}-${idx}`,
        is_selected: !o.is_duplicate,
      }));
      setCurrentOrders(ordersWithSelection);
      setTotalRows(data.total_rows);
      setFlaggedRows(data.flagged_rows);

      showToast('Parsed', 'Excel parsed. Review the preview below.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Upload Failed', err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Discard preview
  const handleDiscard = async () => {
    if (!currentSessionId) return;
    if (!window.confirm('Are you sure you want to discard this preview and cancel the import?')) return;

    try {
      await fetch('/api/import/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSessionId }),
      });

      setCurrentSessionId(null);
      setCurrentOrders([]);
      setTotalRows(0);
      setFlaggedRows(0);
      setFile(null);
      setSelectedTemplate('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showToast('Discarded', 'Import session cancelled', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm and Apply
  const handleConfirm = async () => {
    if (!currentSessionId) return;

    const selectedOrders = currentOrders.filter((o) => o.is_selected);
    if (selectedOrders.length === 0) {
      showToast('Warning', 'No orders selected to import', 'warning');
      return;
    }

    let hasUnmapped = false;
    let hasInvalidQty = false;

    for (const o of selectedOrders) {
      if (!o.splits || o.splits.length === 0) {
        hasUnmapped = true;
        break;
      }
      for (const s of o.splits) {
        if (!s.product_id) {
          hasUnmapped = true;
        }
        const qty = parseInt(s.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          hasInvalidQty = true;
        }
      }
    }

    if (hasUnmapped) {
      showToast('Error', 'Please resolve all highlighted yellow dropdowns to map products before importing', 'error');
      return;
    }

    if (hasInvalidQty) {
      showToast('Error', 'Please enter a valid positive quantity for all split items', 'error');
      return;
    }

    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          orders: selectedOrders,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast('Import Complete', `Applied ${result.applied_rows} orders. ${result.flagged_rows} need review.`, 'success');
        
        setCurrentSessionId(null);
        setCurrentOrders([]);
        setTotalRows(0);
        setFlaggedRows(0);
        setFile(null);
        setSelectedTemplate('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        queryClient.invalidateQueries({ queryKey: ['products'] });

        if (result.flagged_rows > 0) {
          navigate({ to: '/review' });
        } else {
          navigate({ to: '/' });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Import Failed', err.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Connection error', 'error');
    }
  };

  // Split management
  const handleSplitQtyChange = (orderIdx, splitIdx, newQty) => {
    const nextOrders = currentOrders.map((order, oIdx) => {
      if (oIdx !== orderIdx) return order;
      return {
        ...order,
        splits: order.splits.map((split, sIdx) => {
          if (sIdx !== splitIdx) return split;
          return { ...split, quantity: newQty };
        })
      };
    });
    setCurrentOrders(nextOrders);
    syncSession(nextOrders);
  };

  const handleSplitProductChange = (orderIdx, splitIdx, productId) => {
    const selectedProd = products.find((p) => p.id === productId);
    const nextOrders = currentOrders.map((order, oIdx) => {
      if (oIdx !== orderIdx) return order;
      return {
        ...order,
        splits: order.splits.map((split, sIdx) => {
          if (sIdx !== splitIdx) return split;
          return {
            ...split,
            product_id: productId,
            product_name: selectedProd ? selectedProd.name : '',
            parse_source: 'manual'
          };
        })
      };
    });
    setCurrentOrders(nextOrders);
    syncSession(nextOrders);
  };

  const handleAddSplit = (orderIdx, rawText) => {
    const nextOrders = currentOrders.map((order, oIdx) => {
      if (oIdx !== orderIdx) return order;
      return {
        ...order,
        splits: [
          ...order.splits,
          {
            product_id: null,
            product_name: '',
            quantity: 1,
            parse_source: 'auto_split',
            original_text: rawText,
          }
        ]
      };
    });
    setCurrentOrders(nextOrders);
    syncSession(nextOrders);
  };

  const handleDeleteSplit = (orderIdx, splitIdx) => {
    const nextOrders = currentOrders.map((order, oIdx) => {
      if (oIdx !== orderIdx) return order;
      return {
        ...order,
        splits: order.splits.filter((_, sIdx) => sIdx !== splitIdx)
      };
    });
    setCurrentOrders(nextOrders);
    syncSession(nextOrders);
  };

  const handleOrderSelectToggle = (orderIdx, checked) => {
    const nextOrders = currentOrders.map((order, oIdx) => {
      if (oIdx !== orderIdx) return order;
      return { ...order, is_selected: checked };
    });
    setCurrentOrders(nextOrders);
    syncSession(nextOrders);
  };

  const handleAcceptSuggestion = (orderIdx, splitIdx, product) => {
    const nextOrders = currentOrders.map((order, oIdx) => {
      if (oIdx !== orderIdx) return order;
      return {
        ...order,
        splits: order.splits.map((split, sIdx) => {
          if (sIdx !== splitIdx) return split;
          return {
            ...split,
            product_id: product.id,
            product_name: product.name,
            parse_source: 'manual'
          };
        })
      };
    });
    setCurrentOrders(nextOrders);
    syncSession(nextOrders);
  };

  // Filtering / Sorting logic for preview table
  const unmappedCount = currentOrders.filter((o) =>
    o.splits && o.splits.some((s) => !s.product_id)
  ).length;

  const processedOrders = (() => {
    let list = [...currentOrders];
    if (filterMode === 'unmapped') {
      list = list.filter((o) => o.splits && o.splits.some((s) => !s.product_id));
    }
    if (sortUnmappedToTop) {
      list.sort((a, b) => {
        const aNeeds = a.splits && a.splits.some((s) => !s.product_id);
        const bNeeds = b.splits && b.splits.some((s) => !s.product_id);
        if (aNeeds && !bNeeds) return -1;
        if (!aNeeds && bNeeds) return 1;
        return 0;
      });
    }
    return list;
  })();

  const duplicateCount = currentOrders.filter((o) => o.is_duplicate).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Upload Section */}
      <div className="section-card" id="upload-section">
        <div className="section-header">
          <h2>Upload Sales Excel</h2>
        </div>
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
          <div className="form-group">
            <label htmlFor="import-template-select">Select E-commerce Template</label>
            <select
              id="import-template-select"
              required
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">-- Select template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="excel-file-input">Select Excel File (.xlsx, .xls)</label>
            <input
              ref={fileInputRef}
              type="file"
              id="excel-file-input"
              accept=".xlsx, .xls"
              required
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ justifyContent: 'center', alignSelf: 'flex-start' }}
            disabled={isUploading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            {isUploading ? '⌛ Parsing file...' : 'Upload and Preview'}
          </button>
        </form>
      </div>

      {/* Preview Section */}
      {currentSessionId && (
        <div id="import-preview-section" className="section-card">
          <div className="section-header">
            <h2>Import Preview</h2>
            <div className="actions-cell">
              <button id="btn-discard-import" className="btn btn-secondary" onClick={handleDiscard}>
                Discard
              </button>
              <button id="btn-confirm-import" className="btn btn-primary" onClick={handleConfirm}>
                Confirm & Apply Stock
              </button>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <div className="card-title" style={{ fontSize: '0.75rem' }}>Total Orders</div>
              <div className="card-value" style={{ fontSize: '1.5rem' }}>{totalRows}</div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div className="card-title" style={{ fontSize: '0.75rem' }}>Cancelled (Flags Review)</div>
              <div className="card-value" style={{ fontSize: '1.5rem', color: 'var(--warning)' }}>{flaggedRows}</div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div className="card-title" style={{ fontSize: '0.75rem' }}>Duplicates Found</div>
              <div className="card-value" style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>{duplicateCount}</div>
            </div>
          </div>

          {/* Toolbar for filtering/sorting */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '1.5rem',
              background: 'var(--bg-primary)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
              <div style={{ display: 'inline-flex', background: 'var(--border-color)', padding: '3px', borderRadius: 'var(--border-radius-sm)', gap: '2px' }}>
                <button
                  className="btn-segmented"
                  style={{
                    border: 'none',
                    background: filterMode === 'all' ? 'var(--bg-secondary)' : 'transparent',
                    color: filterMode === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    boxShadow: filterMode === 'all' ? 'var(--shadow-sm)' : 'none',
                  }}
                  onClick={() => setFilterMode('all')}
                >
                  All Orders
                </button>
                <button
                  className="btn-segmented"
                  style={{
                    border: 'none',
                    background: filterMode === 'unmapped' ? 'var(--bg-secondary)' : 'transparent',
                    color: filterMode === 'unmapped' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    boxShadow: filterMode === 'unmapped' ? 'var(--shadow-sm)' : 'none',
                  }}
                  onClick={() => setFilterMode('unmapped')}
                >
                  ⚠️ Needs Mapping (<span>{unmappedCount}</span>)
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="sort-unmapped-top" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  id="sort-unmapped-top"
                  name="sort-unmapped-top"
                  checked={sortUnmappedToTop}
                  onChange={(e) => setSortUnmappedToTop(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                Sort Unmapped to Top
              </label>
            </div>
          </div>

          {/* Table wrapper */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Apply</th>
                  <th>Order ID</th>
                  <th>Raw Product Name</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Expedition</th>
                  <th>Suggested Product Split & Mapping</th>
                </tr>
              </thead>
              <tbody id="preview-table-body">
                {processedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No orders match the current filter.
                    </td>
                  </tr>
                ) : (
                  processedOrders.map((order) => {
                    const originalIndex = currentOrders.findIndex((o) => o.id === order.id);
                    const isRowDuplicate = order.is_duplicate;

                    let statusTagClass = 'info';
                    let statusText = order.order_status;
                    if (order.system_status === 'needs_review') {
                      statusTagClass = 'warning';
                      statusText = `${order.order_status} (Cancel Flag)`;
                    }

                    return (
                      <tr key={order.id} style={isRowDuplicate ? { backgroundColor: 'var(--danger-light)' } : {}}>
                        <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
                          <input
                            type="checkbox"
                            id={`select-order-${order.order_id}`}
                            name={`select-order-${order.order_id}`}
                            checked={!!order.is_selected}
                            onChange={(e) => handleOrderSelectToggle(originalIndex, e.target.checked)}
                          />
                        </td>
                        <td style={{ verticalAlign: 'top', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {order.order_id}
                          {isRowDuplicate && (
                            <>
                              <br />
                              <span className="status-tag danger" style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
                                Duplicate
                              </span>
                            </>
                          )}
                        </td>
                        <td style={{ verticalAlign: 'top', fontSize: '0.85rem' }}>{order.product_name_raw}</td>
                        <td style={{ verticalAlign: 'top', fontWeight: 600 }}>{order.quantity}</td>
                        <td style={{ verticalAlign: 'top' }}>
                          <span className={`status-tag ${statusTagClass}`}>{statusText}</span>
                        </td>
                        <td style={{ verticalAlign: 'top', fontSize: '0.85rem' }}>{order.expedition}</td>
                        <td style={{ verticalAlign: 'top' }}>
                          {(!order.splits || order.splits.length === 0) ? (
                            <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>No items mapped!</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {order.splits.map((split, splitIdx) => {
                                const fuzzySuggestion = !split.product_id ? split.fuzzy_suggestion : null;
                                const matchedProduct = products.find(p => p.id === split.product_id);
                                let isSkipped = false;
                                if (matchedProduct && matchedProduct.last_opname_at && order.order_date) {
                                  const oDate = parseOrderDate(order.order_date);
                                  const opDate = parseOpnameDate(matchedProduct.last_opname_at);
                                  if (oDate && opDate && oDate <= opDate) {
                                    isSkipped = true;
                                  }
                                }
                                return (
                                  <div key={splitIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <input
                                        type="number"
                                        id={`split-qty-${originalIndex}-${splitIdx}`}
                                        name={`split-qty-${originalIndex}-${splitIdx}`}
                                        value={split.quantity}
                                        min="1"
                                        style={{ width: '60px', padding: '0.2rem', fontSize: '0.8rem' }}
                                        onChange={(e) => handleSplitQtyChange(originalIndex, splitIdx, parseInt(e.target.value, 10) || 1)}
                                      />
                                      <SearchableSelect
                                        id={`split-product-${originalIndex}-${splitIdx}`}
                                        name={`split-product-${originalIndex}-${splitIdx}`}
                                        selectedId={split.product_id}
                                        products={products}
                                        onChange={(pId) => handleSplitProductChange(originalIndex, splitIdx, pId)}
                                      />
                                      {isSkipped && (
                                        <span className="status-tag info" style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem', whiteSpace: 'nowrap' }} title={`This order date (${order.order_date}) is before/at the last Stock Opname (${matchedProduct.last_opname_at}) for this product. Stock will NOT be deducted.`}>
                                          ✓ Opname Skip
                                        </span>
                                      )}
                                      {order.splits.length > 1 && (
                                        <button
                                          type="button"
                                          className="btn btn-danger btn-sm"
                                          style={{ padding: '0.15rem 0.3rem' }}
                                          onClick={() => handleDeleteSplit(originalIndex, splitIdx)}
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '12px', height: '12px' }}>
                                            <path d="M18 6 6 18M6 6l12 12" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                    {fuzzySuggestion && (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>💡 Suggest: {fuzzySuggestion.product.name} ({fuzzySuggestion.similarity}%)</span>
                                        <button
                                          type="button"
                                          className="btn btn-secondary btn-sm"
                                          style={{ padding: '0.05rem 0.25rem', fontSize: '0.7rem' }}
                                          onClick={() => handleAcceptSuggestion(originalIndex, splitIdx, fuzzySuggestion.product)}
                                        >
                                          Accept
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              <a
                                href="#"
                                style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: '500', display: 'inline-block', marginTop: '0.25rem' }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleAddSplit(originalIndex, order.product_name_raw);
                                }}
                              >
                                ➕ Add another split item
                              </a>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
