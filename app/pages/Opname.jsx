import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../utils/toast';

export default function Opname() {
  const queryClient = useQueryClient();

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'new' | 'details'
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedOpnameId, setSelectedOpnameId] = useState(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Helper to get local date/time string formatted for datetime-local
  const getLocalDatetimeString = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return (new Date(now - tzOffset)).toISOString().slice(0, 16);
  };

  const formatToDatetimeLocal = (dateStr) => {
    if (!dateStr) return '';
    const clean = dateStr.replace(' ', 'T');
    if (clean.length > 16) return clean.slice(0, 16);
    return clean;
  };

  // Form states (New Opname)
  const [notes, setNotes] = useState('');
  const [customDate, setCustomDate] = useState(getLocalDatetimeString());
  const [physicalCounts, setPhysicalCounts] = useState({}); // { [productId]: count }
  const [productSearch, setProductSearch] = useState('');

  // Edit states (Existing Opname)
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPhysicalCounts, setEditPhysicalCounts] = useState({});

  // Fetch all opname audit history
  const { data: opnames = [], isLoading, error } = useQuery({
    queryKey: ['opnames'],
    queryFn: async () => {
      const res = await fetch('/api/stock/opname');
      if (!res.ok) throw new Error('Failed to fetch opname history');
      return res.json();
    }
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

  // REST resync invalidations
  useEffect(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['opnames'] });
    };

    window.addEventListener('resync-data', handleResync);

    return () => {
      window.removeEventListener('resync-data', handleResync);
    };
  }, [queryClient]);

  // Mutation for creating opname
  const createOpnameMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/stock/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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

  const deleteOpnameMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/stock/opname/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete stock opname');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Stock opname deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['opnames'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    }
  });

  const updateOpnameMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await fetch(`/api/stock/opname/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update stock opname');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Stock opname updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['opnames'] });
      queryClient.invalidateQueries({ queryKey: ['opnameDetails', selectedOpnameId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditing(false);
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    }
  });

  // Modal triggers
  const openNewOpnameModal = () => {
    setNotes('');
    setProductSearch('');
    setPhysicalCounts({});
    setIsFormInitialized(false);
    setCustomDate(getLocalDatetimeString());
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
    setIsEditing(false);
    setEditPhysicalCounts({});
  };

  const playAudioTone = (type) => {
    if (!audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'match') {
        const now = ctx.currentTime;
        // First beep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1000, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.1);
        
        // Second beep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, now + 0.12);
        gain2.gain.setValueAtTime(0, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.22);
      } else if (type === 'discrepancy') {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      }
    } catch (e) {
      console.error('Failed to play audio tone:', e);
    }
  };

  const handleInputBlur = (productId, systemStock, currentValStr) => {
    const val = parseInt(currentValStr, 10);
    if (isNaN(val) || val < 0) return;
    if (val === systemStock) {
      playAudioTone('match');
    } else {
      playAudioTone('discrepancy');
    }
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

    const formattedCreatedAt = customDate ? customDate.replace('T', ' ') + ':00' : undefined;

    createOpnameMutation.mutate({
      notes: notes.trim(),
      created_at: formattedCreatedAt,
      items,
    });
  };

  const handleSaveEdit = () => {
    const payloadItems = opnameDetails.items.map(item => {
      return {
        product_id: item.product_id,
        physical_stock: editPhysicalCounts[item.product_id] !== undefined ? editPhysicalCounts[item.product_id] : item.physical_stock
      };
    });
    
    let formattedDate = undefined;
    if (editDate) {
      const dt = new Date(editDate);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        const hr = String(dt.getHours()).padStart(2, '0');
        const min = String(dt.getMinutes()).padStart(2, '0');
        const sec = String(dt.getSeconds()).padStart(2, '0');
        formattedDate = `${y}-${m}-${d} ${hr}:${min}:${sec}`;
      }
    }

    updateOpnameMutation.mutate({
      id: selectedOpnameId,
      payload: {
        notes: editNotes,
        created_at: formattedDate,
        items: payloadItems
      }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-card">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Stock Opname (Physical Inventory Audit)</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            id="btn-toggle-audio" 
            className="btn btn-secondary" 
            onClick={() => setAudioEnabled(!audioEnabled)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              backgroundColor: audioEnabled ? 'rgba(74, 144, 226, 0.15)' : 'transparent',
              borderColor: audioEnabled ? 'var(--primary)' : 'var(--border-color)',
              color: audioEnabled ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            {audioEnabled ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                Audio Guide: ON
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
                Audio Guide: OFF
              </>
            )}
          </button>
          <button id="btn-new-opname" className="btn btn-primary" onClick={openNewOpnameModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5v14" />
            </svg>
            New Stock Opname
          </button>
        </div>
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
                  <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm btn-view-details" onClick={() => openDetailsModal(item.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View Details
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }} onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this stock opname report? Product stock changes will be reverted.')) {
                        deleteOpnameMutation.mutate(item.id);
                      }
                    }} disabled={deleteOpnameMutation.isPending}>
                      Delete
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
                  <label htmlFor="opname-date">Date & Time of Count</label>
                  <input
                    type="datetime-local"
                    id="opname-date"
                    required
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 1rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--border-radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      transition: 'var(--transition)'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Specify the exact date and time when the physical inventory count took place.
                  </span>
                </div>

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
                                onBlur={() => handleInputBlur(p.id, p.current_stock, countVal)}
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
              <h3>{isEditing ? 'Edit Stock Opname Report' : `Stock Opname Report #${selectedOpnameId}`}</h3>
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
              ) : isEditing ? (
                /* EDIT MODE DETAILS FORM */
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Date & Time of Count</label>
                    <input
                      type="datetime-local"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 1rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add audit notes..."
                      style={{
                        width: '100%',
                        padding: '0.6rem 1rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        minHeight: '60px'
                      }}
                    />
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
                            const currentVal = editPhysicalCounts[item.product_id] !== undefined
                              ? editPhysicalCounts[item.product_id]
                              : item.physical_stock;
                            const varVal = currentVal - item.system_stock;
                            const varText = varVal > 0 ? `+${varVal}` : `${varVal}`;
                            let varColor = 'var(--text-secondary)';
                            if (varVal > 0) varColor = 'var(--success)';
                            if (varVal < 0) varColor = 'var(--danger)';

                            return (
                              <tr key={item.id || item.product_id}>
                                <td>{item.name}</td>
                                <td><span className="status-tag info">{item.model}</span></td>
                                <td style={{ textAlign: 'right' }}>{item.system_stock}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10) || 0;
                                      setEditPhysicalCounts(prev => ({ ...prev, [item.product_id]: val }));
                                    }}
                                    onBlur={() => handleInputBlur(item.product_id, item.system_stock, currentVal)}
                                    style={{
                                      width: '80px',
                                      textAlign: 'right',
                                      padding: '0.2rem 0.4rem',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '3px',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--text-primary)',
                                    }}
                                  />
                                </td>
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
              ) : (
                /* VIEW DETAILS MODE (READ-ONLY) */
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
            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
              {isEditing ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={updateOpnameMutation.isPending}>
                    {updateOpnameMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={closeModal}>Close</button>
                  {opnameDetails && (
                    <>
                      <button className="btn btn-secondary" onClick={() => {
                        setEditNotes(opnameDetails.notes || '');
                        setEditDate(formatToDatetimeLocal(opnameDetails.created_at));
                        const counts = {};
                        opnameDetails.items.forEach(item => {
                          counts[item.product_id] = item.physical_stock;
                        });
                        setEditPhysicalCounts(counts);
                        setIsEditing(true);
                      }}>
                        Edit
                      </button>
                      <button className="btn btn-danger" style={{ backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }} onClick={() => {
                        if (window.confirm('Are you sure you want to delete this stock opname report? Product stock changes will be reverted.')) {
                          deleteOpnameMutation.mutate(selectedOpnameId);
                        }
                      }} disabled={deleteOpnameMutation.isPending}>
                        {deleteOpnameMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                      <button className="btn btn-primary" onClick={() => window.print()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <path d="M6 14h12v8H6z" />
                        </svg>
                        Print Report
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
