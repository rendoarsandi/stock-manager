import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../context/WebSocketContext';
import { showToast } from '../utils/toast';

export default function Opname() {
  const queryClient = useQueryClient();
  const { addWsListener } = useWebSocket();

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'new' | 'details'
  const [selectedOpnameId, setSelectedOpnameId] = useState(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Form states (New Opname)
  const [notes, setNotes] = useState('');
  const [physicalCounts, setPhysicalCounts] = useState({}); // { [productId]: count }
  const [productSearch, setProductSearch] = useState('');

  // Fetch all opname audit history
  const { data: opnames = [], isLoading, error } = useQuery({
    queryKey: ['opnames'],
    queryFn: async () => {
      const res = await fetch('/api/stock/opname');
      if (!res.ok) throw new Error('Failed to fetch opname history');
      return res.json();
    },
  });

  // Fetch all catalog products for New Opname audit
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: activeModal === 'new',
  });

  // Fetch single opname report details
  const { data: opnameDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['opnameDetails', selectedOpnameId],
    queryFn: async () => {
      if (!selectedOpnameId) return null;
      const res = await fetch(`/api/stock/opname/${selectedOpnameId}`);
      if (!res.ok) throw new Error('Failed to fetch opname details');
      return res.json();
    },
    enabled: activeModal === 'details' && !!selectedOpnameId,
  });

  // Initialize physical stock counts when products load (exactly once per session)
  useEffect(() => {
    if (activeModal === 'new' && products.length > 0 && !isFormInitialized) {
      const initialCounts = {};
      products.forEach((p) => {
        initialCounts[p.id] = p.current_stock;
      });
      setPhysicalCounts(initialCounts);
      setIsFormInitialized(true);
    }
  }, [products, activeModal, isFormInitialized]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast('Error', 'Failed to load stock opname history', 'error');
    }
  }, [error]);

  // WS invalidations
  useEffect(() => {
    const unsubscribe = addWsListener((msg) => {
      if (msg.type === 'OPNAME_CREATED' || msg.type === 'MOVEMENT_CREATED') {
        queryClient.invalidateQueries({ queryKey: ['opnames'] });
      }
    });

    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['opnames'] });
    };

    window.addEventListener('resync-data', handleResync);

    return () => {
      unsubscribe();
      window.removeEventListener('resync-data', handleResync);
    };
  }, [addWsListener, queryClient]);

  // Mutation for creating opname
  const createOpnameMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/stock/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save stock opname');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Stock opname saved successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['opnames'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  // Modal triggers
  const openNewOpnameModal = () => {
    setNotes('');
    setProductSearch('');
    setPhysicalCounts({});
    setIsFormInitialized(false);
    setActiveModal('new');
  };

  const openDetailsModal = (id) => {
    setSelectedOpnameId(id);
    setActiveModal('details');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedOpnameId(null);
    setIsFormInitialized(false);
  };

  const handlePhysicalCountChange = (productId, val) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: val,
    }));
  };

  const handleNewOpnameSubmit = (e) => {
    e.preventDefault();

    const items = [];
    let hasError = false;

    products.forEach((p) => {
      const val = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : p.current_stock;
      const physical_stock = parseInt(val, 10);
      if (isNaN(physical_stock) || physical_stock < 0) {
        hasError = true;
      } else {
        items.push({
          product_id: p.id,
          physical_stock,
        });
      }
    });

    if (hasError) {
      showToast('Error', 'Please enter a valid non-negative physical stock count for all products', 'error');
      return;
    }

    createOpnameMutation.mutate({
      notes: notes.trim(),
      items,
    });
  };

  // Date formatting helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      let cleanStr = null;
      if (typeof dateStr === 'string') {
        cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(/-/g, '/');
      } else if (typeof dateStr === 'number') {
        cleanStr = dateStr;
      }
      if (!cleanStr) return String(dateStr);

      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  // Filter products for physical count list
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.model.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="section-card">
      <div className="section-header">
        <h2>Stock Opname (Physical Inventory Audit)</h2>
        <button id="btn-new-opname" className="btn btn-primary" onClick={openNewOpnameModal}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 12h14M12 5v14" />
          </svg>
          New Stock Opname
        </button>
      </div>

      <div className="table-wrapper">
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
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading reports...
                </td>
              </tr>
            ) : opnames.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No stock opname records found. Click "New Stock Opname" to start.
                </td>
              </tr>
            ) : (
              opnames.map((item) => (
                <tr key={item.id}>
                  <td><strong>#{item.id}</strong></td>
                  <td>{formatDate(item.created_at)}</td>
                  <td><span className="status-tag info">{item.username || 'Unknown'}</span></td>
                  <td><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.notes || '-'}</span></td>
                  <td><span className="status-tag success">{item.items_count} products</span></td>
                  <td>
                    <button className="btn btn-secondary btn-sm btn-view-details" onClick={() => openDetailsModal(item.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Stock Opname Modal */}
      {activeModal === 'new' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>New Stock Opname</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="new-opname-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleNewOpnameSubmit}>
                <div className="form-group">
                  <label htmlFor="opname-notes">Audit Notes</label>
                  <textarea
                    id="opname-notes"
                    placeholder="Enter notes for this audit (e.g. Weekly physical stock count)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Product Physical Counts</div>
                  <input
                    type="text"
                    id="opname-search-input"
                    className="form-input"
                    placeholder="🔍 Search product name or SKU..."
                    style={{ maxWidth: '300px', padding: '0.35rem 0.5rem', fontSize: '0.8rem', marginBottom: 0 }}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>

                <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Product Name (SKU)</th>
                        <th style={{ textAlign: 'right', width: '100px' }}>System</th>
                        <th style={{ textAlign: 'right', width: '120px' }}>Physical Count</th>
                      </tr>
                    </thead>
                    <tbody id="opname-modal-table-body">
                      {filteredProducts.map((p) => {
                        const countVal = physicalCounts[p.id] ?? p.current_stock;
                        return (
                          <tr key={p.id} className="opname-product-row">
                            <td>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.model}</div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 500 }}>{p.current_stock}</td>
                            <td style={{ textAlign: 'right' }}>
                              <input
                                type="number"
                                className="physical-stock-input form-input"
                                style={{ width: '100px', padding: '0.25rem 0.5rem', textAlign: 'right' }}
                                min="0"
                                required
                                value={countVal}
                                onChange={(e) => handlePhysicalCountChange(p.id, e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="new-opname-form" className="btn btn-primary" disabled={createOpnameMutation.isPending}>
                {createOpnameMutation.isPending ? 'Saving...' : 'Save Opname'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details / Printable Variance Report Modal */}
      {activeModal === 'details' && selectedOpnameId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>Stock Opname Report #{selectedOpnameId}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              {isLoadingDetails ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading details...
                </div>
              ) : !opnameDetails ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--danger)' }}>
                  Failed to load report details.
                </div>
              ) : (
                <div className="print-report-container">
                  <div className="print-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="print-only-title" style={{ display: 'none', marginBottom: '0.5rem', borderBottom: '2px solid var(--text-primary)', paddingBottom: '0.5rem' }}>
                      STOCK OPNAME REPORT
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.95rem' }}>
                      <strong>Opname ID:</strong> <span>#{opnameDetails.id}</span>
                      <strong>Date:</strong> <span>{formatDate(opnameDetails.created_at)}</span>
                      <strong>User:</strong> <span>{opnameDetails.username || 'Unknown'}</span>
                      <strong>Notes:</strong> <span>{opnameDetails.notes || '-'}</span>
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th style={{ textAlign: 'right' }}>System Stock</th>
                          <th style={{ textAlign: 'right' }}>Physical Stock</th>
                          <th style={{ textAlign: 'right' }}>Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opnameDetails.items &&
                          opnameDetails.items.map((item) => {
                            const varVal = item.variance;
                            const varText = varVal > 0 ? `+${varVal}` : `${varVal}`;
                            let varColor = 'var(--text-secondary)';
                            if (varVal > 0) varColor = 'var(--success)';
                            if (varVal < 0) varColor = 'var(--danger)';

                            return (
                              <tr key={item.id || item.product_id}>
                                <td>{item.name}</td>
                                <td><span className="status-tag info">{item.model}</span></td>
                                <td style={{ textAlign: 'right' }}>{item.system_stock}</td>
                                <td style={{ textAlign: 'right' }}>{item.physical_stock}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: varColor }}>
                                  {varText}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()} disabled={!opnameDetails}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <path d="M6 14h12v8H6z" />
                </svg>
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
