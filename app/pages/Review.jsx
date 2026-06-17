import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../utils/toast';

export default function Review() {
  const queryClient = useQueryClient();

  // Modal states for order resolution
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveTargetOrder, setResolveTargetOrder] = useState(null);
  const [resolveType, setResolveType] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');

  // Local state for select dropdowns & quantities of ambiguous items
  const [ambiguousSelections, setAmbiguousSelections] = useState({});

  // Fetch products (for catalog mapping dropdown)
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  // Fetch review orders
  const { data: reviewOrders = [], isLoading: isLoadingOrders, error: errorOrders } = useQuery({
    queryKey: ['reviewOrders'],
    queryFn: async () => {
      const res = await fetch('/api/review/orders');
      if (!res.ok) throw new Error('Failed to fetch review orders');
      return res.json();
    }
  });

  // Fetch ambiguous items
  const { data: ambiguousItems = [], isLoading: isLoadingAmbiguous, error: errorAmbiguous } = useQuery({
    queryKey: ['ambiguousItems'],
    queryFn: async () => {
      const res = await fetch('/api/review/ambiguous');
      if (!res.ok) throw new Error('Failed to fetch ambiguous items');
      return res.json();
    }
  });

  // Handle errors
  useEffect(() => {
    if (errorOrders || errorAmbiguous) {
      showToast('Error', 'Failed to load review data', 'error');
    }
  }, [errorOrders, errorAmbiguous]);

  // REST resync invalidations
  useEffect(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['reviewOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ambiguousItems'] });
    };

    window.addEventListener('resync-data', handleResync);

    return () => {
      window.removeEventListener('resync-data', handleResync);
    };
  }, [queryClient]);

  // Mutations
  const resolveOrderMutation = useMutation({
    mutationFn: async ({ order_id, resolution, resolution_notes }) => {
      const res = await fetch('/api/review/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, resolution, resolution_notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to resolve order');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Resolved', 'Order status resolved successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['reviewOrders'] });
      closeResolveModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const confirmSplitMutation = useMutation({
    mutationFn: async ({ item_id, product_id, quantity }) => {
      const res = await fetch('/api/review/confirm-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id, product_id, quantity }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Mapping failed');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Mapped', 'Item mapped and stock movement registered', 'success');
      queryClient.invalidateQueries({ queryKey: ['ambiguousItems'] });
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  // Modal controls
  const openResolveModal = (order) => {
    setResolveTargetOrder(order);
    setResolveType('');
    setResolveNotes('');
    setIsResolveModalOpen(true);
  };

  const closeResolveModal = () => {
    setIsResolveModalOpen(false);
    setResolveTargetOrder(null);
  };

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (!resolveType || !resolveNotes) {
      showToast('Warning', 'Please enter all fields', 'warning');
      return;
    }
    resolveOrderMutation.mutate({
      order_id: resolveTargetOrder.id,
      resolution: resolveType,
      resolution_notes: resolveNotes,
    });
  };

  // Ambiguous item local state handlers
  const handleAmbSelectChange = (itemId, productId) => {
    setAmbiguousSelections((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        productId: productId,
      },
    }));
  };

  const handleAmbQtyChange = (itemId, quantity) => {
    setAmbiguousSelections((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: quantity,
      },
    }));
  };

  const handleConfirmSplit = (item) => {
    const selection = ambiguousSelections[item.id];
    const productId = selection?.productId;
    const quantity = selection?.quantity ?? item.quantity;

    if (!productId) {
      showToast('Warning', 'Please select a catalog product first', 'warning');
      return;
    }

    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      showToast('Warning', 'Quantity must be a positive number', 'warning');
      return;
    }

    confirmSplitMutation.mutate({
      item_id: item.id,
      product_id: parseInt(productId, 10),
      quantity: qtyVal,
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reviewOrders'] });
    queryClient.invalidateQueries({ queryKey: ['ambiguousItems'] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* 1. Flagged Cancelled / Stuck Orders Section */}
      <div className="section-card">
        <div className="section-header">
          <h2>Cancelled & Stuck Orders (Needs Review)</h2>
          <button id="btn-refresh-review" className="btn btn-secondary btn-sm" onClick={handleRefresh}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16m0 0V21m0-5h5M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8m0 0V3m0 5h-5" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="table-wrapper">
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
              {isLoadingOrders ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading flagged orders...
                  </td>
                </tr>
              ) : reviewOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No flagged orders require review. Good job!
                  </td>
                </tr>
              ) : (
                reviewOrders.map((o) => {
                  const splitsHtml = o.items ? (
                    o.items.map((item, idx) => (
                      <div key={item.id || idx} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <strong>{item.quantity}x</strong> {item.product_name}{' '}
                        {item.is_confirmed === 0 && (
                          <span className="status-tag warning" style={{ fontSize: '0.6rem', padding: '0.1rem 0.25rem' }}>
                            Unmapped
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>No items mapped!</span>
                  );

                  return (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{o.order_id}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{o.customer_name || 'Anonymous'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.expedition || 'Unknown Courier'}</div>
                      </td>
                      <td
                        style={{
                          fontSize: '0.85rem',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={o.product_name_raw}
                      >
                        {o.product_name_raw}
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.quantity}</td>
                      <td>
                        <span className="status-tag warning">{o.order_status}</span>
                      </td>
                      <td>{splitsHtml}</td>
                      <td>
                        <button className="btn btn-primary btn-sm btn-resolve-order" onClick={() => openResolveModal(o)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Ambiguous Items Section */}
      <div className="section-card">
        <div className="section-header">
          <h2>Ambiguous Product Names (Awaiting Mapping)</h2>
        </div>
        <div className="table-wrapper">
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
              {isLoadingAmbiguous ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading ambiguous items...
                  </td>
                </tr>
              ) : ambiguousItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No ambiguous items require mapping. Excellent!
                  </td>
                </tr>
              ) : (
                ambiguousItems.map((item) => {
                  const currentSelection = ambiguousSelections[item.id] || {};
                  const currentProductId = currentSelection.productId || '';
                  const currentQty = currentSelection.quantity ?? item.quantity;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.order_id}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 500, maxWidth: '250px' }}>
                        {item.original_text || item.product_name_raw}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.order_date}</td>
                      <td>
                        <input
                          type="number"
                          className="amb-qty-input"
                          value={currentQty}
                          min="1"
                          style={{ width: '70px', padding: '0.25rem', fontSize: '0.85rem' }}
                          onChange={(e) => handleAmbQtyChange(item.id, parseInt(e.target.value, 10) || 1)}
                        />
                      </td>
                      <td>
                        <select
                          className="amb-product-select"
                          style={{
                            width: '100%',
                            maxWidth: '250px',
                            padding: '0.25rem',
                            fontSize: '0.85rem',
                            borderColor: currentProductId ? '' : 'var(--warning)',
                            backgroundColor: currentProductId ? '' : 'var(--warning-light)',
                          }}
                          value={currentProductId}
                          onChange={(e) => handleAmbSelectChange(item.id, e.target.value)}
                        >
                          <option value="">-- Choose matching product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.model})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm btn-confirm-split"
                          onClick={() => handleConfirmSplit(item)}
                          disabled={confirmSplitMutation.isPending}
                        >
                          {confirmSplitMutation.isPending && confirmSplitMutation.variables?.item_id === item.id ? '⌛...' : 'Confirm'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Modal */}
      {isResolveModalOpen && resolveTargetOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Resolve Flagged Order</h3>
              <button className="modal-close" onClick={closeResolveModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="modal-resolve-form" className="login-form" style={{ gap: '1.25rem' }} onSubmit={handleResolveSubmit}>
                <div
                  style={{
                    fontSize: '0.9rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--warning-light)',
                    color: 'var(--warning)',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    fontWeight: 500,
                  }}
                >
                  ⚠️ Resolving cancelled order: <strong>{resolveTargetOrder.order_id}</strong>
                </div>
                <div className="form-group">
                  <label htmlFor="resolve-type">Select Resolution Type</label>
                  <select
                    id="resolve-type"
                    required
                    value={resolveType}
                    onChange={(e) => setResolveType(e.target.value)}
                  >
                    <option value="">-- Choose resolution --</option>
                    <option value="returned">🔄 Returned (Items back in warehouse, no stock changes needed)</option>
                    <option value="lost">❌ Lost / Gone (Items lost in transit, deduct stock permanent write-off)</option>
                    <option value="investigating">⌛ Investigating (Keep flagged, update notes only)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="resolve-notes">Resolution Notes / Reason</label>
                  <textarea
                    id="resolve-notes"
                    required
                    placeholder="e.g. Package returned damaged, customer request, lost at J&T warehouse..."
                    style={{ height: '100px' }}
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeResolveModal}>Cancel</button>
              <button type="submit" form="modal-resolve-form" className="btn btn-primary" disabled={resolveOrderMutation.isPending}>
                {resolveOrderMutation.isPending ? 'Submitting...' : 'Submit Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
