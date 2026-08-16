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

  // Fetch review orders
  const { data: reviewOrders = [], isLoading: isLoadingOrders, error: errorOrders } = useQuery({
    queryKey: ['reviewOrders'],
    queryFn: async () => {
      const res = await fetch('/api/review/orders');
      if (!res.ok) throw new Error('Failed to fetch review orders');
      return res.json();
    }
  });

  // Handle errors
  useEffect(() => {
    if (errorOrders) {
      showToast('Error', 'Failed to load review orders', 'error');
    }
  }, [errorOrders]);

  // REST resync invalidations
  useEffect(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['reviewOrders'] });
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reviewOrders'] });
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
                <th>Resi Number</th>
                <th>Product Description</th>
                <th>Quantity</th>
                <th>Order Status</th>
                <th>Review Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="review-orders-table-body">
              {isLoadingOrders ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading review orders...
                  </td>
                </tr>
              ) : reviewOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No flagged orders found. All operational flows normal.
                  </td>
                </tr>
              ) : (
                reviewOrders.map((o) => {
                  return (
                    <tr key={o.order_id || o.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{o.order_id}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{o.resi_number || '-'}</td>
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ fontWeight: 500 }}>{o.product_name_raw || o.product_name || '-'}</div>
                        {o.sku_ref && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            SKU: {o.sku_ref}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.quantity}</td>
                      <td>
                        <span className={`badge ${
                          o.order_status?.toLowerCase().includes('batal') || o.order_status?.toLowerCase().includes('cancel')
                            ? 'badge-danger'
                            : o.order_status?.toLowerCase().includes('return')
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }`}>
                          {o.order_status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {o.cancellation_reason || o.cancel_return_status || (
                            o.order_status?.toLowerCase().includes('batal')
                              ? 'Order cancelled by buyer/system'
                              : o.order_status?.toLowerCase().includes('return')
                              ? 'Customer return request'
                              : 'System flagged review'
                          )}
                        </div>
                      </td>
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
