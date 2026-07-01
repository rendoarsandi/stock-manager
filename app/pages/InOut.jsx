import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../utils/toast';

const getLocalDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function InOut() {
  const queryClient = useQueryClient();

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('selected-in-out-product-id');
      return savedId ? { id: parseInt(savedId, 10) } : null;
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock Movement Form Fields
  const [movementDate, setMovementDate] = useState(getLocalDateTimeString());
  const [movementType, setMovementType] = useState('manual_adjust'); // manual_adjust, sale, return, write_off, initial
  const [direction, setDirection] = useState('IN'); // IN, OUT
  const [quantity, setQuantity] = useState('');

  // Inline edit state for Ledger Table
  const [editingField, setEditingField] = useState({ movementId: null, field: null });
  const [editValue, setEditValue] = useState('');

  const dropdownRef = useRef(null);

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    }
  });

  // Fetch selected product's ledger
  const { data: movements = [], isLoading: isLoadingLedger } = useQuery({
    queryKey: ['productLedger', selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const res = await fetch(`/api/products/${selectedProduct.id}/ledger`);
      if (!res.ok) throw new Error('Failed to fetch product ledger');
      return res.json();
    },
    enabled: !!selectedProduct?.id
  });

  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Fetch global ledger history
  const { data: globalMovements = [], isLoading: isLoadingGlobalLedger } = useQuery({
    queryKey: ['globalLedger'],
    queryFn: async () => {
      const res = await fetch('/api/stock/history');
      if (!res.ok) throw new Error('Failed to fetch stock history');
      return res.json();
    }
  });

  const filteredGlobalMovements = useMemo(() => {
    if (!globalSearchQuery) return globalMovements;
    const query = globalSearchQuery.toLowerCase().trim();
    return globalMovements.filter(m =>
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.model && m.model.toLowerCase().includes(query)) ||
      (m.reference && m.reference.toLowerCase().includes(query)) ||
      (m.movement_type && m.movement_type.toLowerCase().includes(query))
    );
  }, [globalMovements, globalSearchQuery]);

  const deleteMovementMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/stock/movements/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete movement');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Stock movement deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productLedger', selectedProduct?.id] });
      queryClient.invalidateQueries({ queryKey: ['globalLedger'] });
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    }
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync searchQuery when selected product changes
  useEffect(() => {
    if (selectedProduct && selectedProduct.name) {
      setSearchQuery(selectedProduct.name + (selectedProduct.model ? ` (${selectedProduct.model})` : ''));
    } else if (!selectedProduct) {
      setSearchQuery('');
    }
  }, [selectedProduct]);

  // Save selected product to localStorage
  useEffect(() => {
    if (selectedProduct && selectedProduct.id) {
      localStorage.setItem('selected-in-out-product-id', String(selectedProduct.id));
    } else {
      localStorage.removeItem('selected-in-out-product-id');
    }
  }, [selectedProduct]);

  // Restore selected product details from products list once loaded
  useEffect(() => {
    if (products && products.length > 0 && selectedProduct && !selectedProduct.name) {
      const match = products.find(p => p.id === selectedProduct.id);
      if (match) {
        setSelectedProduct(match);
      }
    }
  }, [products, selectedProduct]);

  // Handle autocomplete search
  const filteredProducts = useMemo(() => {
    if (!searchQuery || selectedProduct) return [];
    const query = searchQuery.toLowerCase().trim();
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.model && p.model.toLowerCase().includes(query)) ||
      (p.master_sku && p.master_sku.toLowerCase().includes(query))
    );
  }, [searchQuery, products, selectedProduct]);

  const handleAddMovementSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      showToast('Warning', 'Please select or type a product name', 'warning');
      return;
    }

    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      showToast('Warning', 'Please enter a valid positive quantity', 'warning');
      return;
    }

    // Determine final signed quantity
    const quantityChange = direction === 'OUT' ? -qtyVal : qtyVal;

    // Convert local input date string to format YYYY-MM-DD HH:mm:ss
    let formattedDate = undefined;
    if (movementDate) {
      const dt = new Date(movementDate);
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

    let targetProduct = selectedProduct;

    // If not selected explicitly, match with existing product (case-insensitive)
    if (!targetProduct) {
      const match = products.find(p => p.name.toLowerCase() === trimmedQuery.toLowerCase());
      if (match) {
        targetProduct = match;
        setSelectedProduct(match);
      }
    }

    setIsSubmitting(true);

    try {
      // If product doesn't exist, auto-create it
      if (!targetProduct) {
        const createRes = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedQuery,
            initial_stock: 0,
            low_stock_threshold: 10
          })
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.message || 'Failed to auto-create product');
        }
        targetProduct = { id: createData.id, name: trimmedQuery };
        setSelectedProduct(targetProduct);
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }

      // Now save stock movement
      const adjustRes = await fetch(`/api/products/${targetProduct.id}/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity_change: quantityChange,
          movement_type: movementType,
          reference: undefined,
          created_at: formattedDate
        }),
      });
      const adjustData = await adjustRes.json();
      if (!adjustRes.ok) {
        throw new Error(adjustData.message || 'Failed to add stock movement');
      }

      showToast('Success', 'Stock movement recorded', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productLedger', targetProduct.id] });
      queryClient.invalidateQueries({ queryKey: ['globalLedger'] });
      setQuantity('');
      setMovementDate(getLocalDateTimeString());
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline editing handler
  const handleSaveField = async (movementId, fieldName) => {
    try {
      const body = {};
      if (fieldName === 'date') body.created_at = editValue;
      if (fieldName === 'reference') body.reference = editValue;
      if (fieldName === 'type') body.movement_type = editValue;
      if (fieldName === 'qty') {
        const parsedVal = parseInt(editValue, 10);
        if (isNaN(parsedVal)) throw new Error('Quantity must be a valid number');
        body.quantity_change = parsedVal;
      }

      const res = await fetch(`/api/stock/movements/${movementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update field');
      }

      showToast('Success', 'Movement updated successfully', 'success');
      setEditingField({ movementId: null, field: null });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productLedger', selectedProduct?.id] });
      queryClient.invalidateQueries({ queryKey: ['globalLedger'] });
    } catch (err) {
      console.error(err);
      showToast('Error', err.message || 'Failed to update field', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(500px, 2fr)', gap: '2rem', alignItems: 'start' }}>
      
      {/* Left Column: Form Card */}
      <div className="section-card">
        <div className="section-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>ADD IN & OUT</h2>
        </div>

        <form className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleAddMovementSubmit}>
          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label>Product *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Search existing product or type new name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedProduct(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                style={{ flex: 1 }}
              />
              {selectedProduct && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedProduct(null)}
                  title="Clear selection"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  &times;
                </button>
              )}
            </div>

            {showDropdown && filteredProducts.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                maxHeight: '200px',
                overflowY: 'auto',
                marginTop: '0.25rem'
              }}>
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--accent-light)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = ''}
                  >
                    <strong style={{ color: 'var(--text-primary)' }}>{p.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      SKU: {p.model || '-'} | Master: {p.master_sku || '-'} | Stock: {p.current_stock}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="datetime-local"
              required
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
          </div>



          <div className="form-group">
            <label>Movement Type</label>
            <select
              value={movementType}
              onChange={(e) => {
                const val = e.target.value;
                setMovementType(val);
                // Auto-set direction based on movement type defaults
                if (val === 'sale' || val === 'write_off') {
                  setDirection('OUT');
                } else if (val === 'return' || val === 'initial') {
                  setDirection('IN');
                }
              }}
            >
              <option value="manual_adjust">MANUAL ADJUSTMENT</option>
              <option value="initial">STOCK OPNAME</option>
              <option value="sale">SALE</option>
              <option value="return">RETURNED</option>
              <option value="write_off">WRITE OFF</option>
            </select>
          </div>

          <div className="form-group">
            <label>Direction</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="direction"
                  checked={direction === 'IN'}
                  onChange={() => setDirection('IN')}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>IN (Stock Addition)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="direction"
                  checked={direction === 'OUT'}
                  onChange={() => setDirection('OUT')}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>OUT (Stock Reduction)</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Quantity *</label>
            <input
              type="number"
              min="1"
              required
              placeholder="Enter positive integer"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Stock Movement'}
          </button>
        </form>
      </div>

      {/* Right Column: Ledger Table */}
      <div className="section-card" style={{ minHeight: '400px' }}>
        <div className="section-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Stock Movement History</h2>
          {selectedProduct && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Showing ledger for: <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct.name}</strong> {selectedProduct.model && `(${selectedProduct.model})`}
            </p>
          )}
        </div>

        {!selectedProduct ? (
          <div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Search history by product name, SKU, or reference..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
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
            
            {isLoadingGlobalLedger ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                <span className="loading-spinner" style={{ marginRight: '0.5rem' }}></span> Loading stock history...
              </div>
            ) : filteredGlobalMovements.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                No stock movements found.
              </div>
            ) : (
              <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="hover-ledger-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>DATE</th>
                      <th rowSpan={2} style={{ textAlign: 'left', verticalAlign: 'middle', fontSize: '0.8rem' }}>PRODUCT</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>REF / ORDER ID</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>DESCRIPTION</th>
                      <th colSpan={2} style={{ textAlign: 'center', fontSize: '0.8rem' }}>STOCK MOVEMENT</th>
                      <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>ACTIONS</th>
                    </tr>
                    <tr>
                      <th style={{ color: 'var(--success)', textAlign: 'center', fontSize: '0.75rem' }}>IN</th>
                      <th style={{ color: 'var(--danger)', textAlign: 'center', fontSize: '0.75rem' }}>OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGlobalMovements.map((m, idx) => {
                      const qty = m.quantity_change;

                      let cleanStr = null;
                      if (typeof m.created_at === 'string') {
                        cleanStr = m.created_at.includes('T') ? m.created_at : m.created_at.replace(/-/g, '/');
                      } else if (typeof m.created_at === 'number') {
                        cleanStr = m.created_at;
                      }

                      const dateObj = cleanStr ? new Date(cleanStr) : null;
                      const dateStr = dateObj && !isNaN(dateObj.getTime())
                        ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
                        : (m.created_at || '-');

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

                      let keterangan = m.movement_type ? m.movement_type.toUpperCase() : 'MANUAL';
                      if (m.movement_type === 'initial') {
                        keterangan = 'STOCK OPNAME';
                      } else if (m.movement_type === 'manual_adjust') {
                        if (m.reference && m.reference.toLowerCase().includes('opname')) {
                          keterangan = 'STOCK OPNAME';
                        } else if (qty > 0) {
                          keterangan = 'STOCK IN';
                        } else {
                          keterangan = 'STOCK OUT';
                        }
                      } else if (m.movement_type === 'sale') {
                        keterangan = m.platform_name ? m.platform_name.toUpperCase() : 'SALE';
                      } else if (m.movement_type === 'return') {
                        keterangan = 'RETURNED';
                      } else if (m.movement_type === 'write_off') {
                        keterangan = 'WRITE OFF';
                      }

                      const masuk = qty > 0 ? qty : '';
                      const keluar = qty < 0 ? Math.abs(qty) : '';

                      return (
                        <tr key={m.id || idx}>
                          {/* Date Column */}
                          <td style={{ textAlign: 'center' }}>
                            {editingField.movementId === m.id && editingField.field === 'date' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveField(m.id, 'date')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveField(m.id, 'date');
                                  else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                                }}
                                autoFocus
                                style={{
                                  width: '90px',
                                  fontSize: '0.75rem',
                                  padding: '0.1rem 0.2rem',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '3px',
                                  textAlign: 'center'
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingField({ movementId: m.id, field: 'date' });
                                  setEditValue(dateStr);
                                }}
                                style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }}
                                title="Click to edit date"
                              >
                                {dateStr}
                              </span>
                            )}
                          </td>

                          {/* Product Column */}
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 500 }}>{m.name || 'Unknown'}</div>
                            {m.model && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.model}</div>}
                          </td>

                          {/* Ref / Order ID Column */}
                          <td>
                            {editingField.movementId === m.id && editingField.field === 'reference' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveField(m.id, 'reference')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveField(m.id, 'reference');
                                  else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                                }}
                                autoFocus
                                style={{
                                  width: '120px',
                                  fontSize: '0.75rem',
                                  padding: '0.1rem 0.2rem',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '3px',
                                  fontFamily: 'monospace'
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingField({ movementId: m.id, field: 'reference' });
                                  setEditValue(m.reference || '');
                                }}
                                style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)', fontFamily: 'monospace', fontSize: '0.72rem' }}
                                title="Click to edit Ref / Order ID"
                              >
                                {noSj || '-'}
                              </span>
                            )}
                          </td>

                          {/* Description Column */}
                          <td>
                            {editingField.movementId === m.id && editingField.field === 'type' ? (
                              <select
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveField(m.id, 'type')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveField(m.id, 'type');
                                  else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                                }}
                                autoFocus
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.1rem',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '3px'
                                }}
                              >
                                <option value="initial">STOCK OPNAME</option>
                                <option value="manual_adjust">MANUAL ADJUST</option>
                                <option value="sale">SALE</option>
                                <option value="return">RETURNED</option>
                                <option value="write_off">WRITE OFF</option>
                              </select>
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingField({ movementId: m.id, field: 'type' });
                                  setEditValue(m.movement_type);
                                }}
                                style={{ cursor: 'pointer' }}
                                title="Click to edit type"
                              >
                                <span className="status-tag info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', display: 'inline-block', borderBottom: '1px dashed var(--text-muted)' }}>
                                  {keterangan}
                                </span>
                              </span>
                            )}
                          </td>

                          {/* IN Column */}
                          <td style={{ color: 'var(--success)', fontWeight: 600, textAlign: 'center' }}>
                            {editingField.movementId === m.id && editingField.field === 'qty' && qty >= 0 ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveField(m.id, 'qty')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveField(m.id, 'qty');
                                  else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                                }}
                                autoFocus
                                style={{
                                  width: '60px',
                                  fontSize: '0.75rem',
                                  padding: '0.1rem 0.2rem',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '3px',
                                  textAlign: 'center'
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingField({ movementId: m.id, field: 'qty' });
                                  setEditValue(String(qty));
                                }}
                                style={{ cursor: 'pointer', borderBottom: qty > 0 ? '1px dashed var(--success)' : 'none' }}
                                title="Click to edit quantity"
                              >
                                {masuk || (qty === 0 ? '0' : '')}
                              </span>
                            )}
                          </td>

                          {/* OUT Column */}
                          <td style={{ color: 'var(--danger)', fontWeight: 600, textAlign: 'center' }}>
                            {editingField.movementId === m.id && editingField.field === 'qty' && qty < 0 ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveField(m.id, 'qty')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveField(m.id, 'qty');
                                  else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                                }}
                                autoFocus
                                style={{
                                  width: '60px',
                                  fontSize: '0.75rem',
                                  padding: '0.1rem 0.2rem',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '3px',
                                  textAlign: 'center'
                                }}
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setEditingField({ movementId: m.id, field: 'qty' });
                                  setEditValue(String(qty));
                                }}
                                style={{ cursor: 'pointer', borderBottom: qty < 0 ? '1px dashed var(--danger)' : 'none' }}
                                title="Click to edit quantity"
                              >
                                {keluar}
                              </span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-sm btn-danger"
                              style={{ backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger)', padding: '0.1rem 0.4rem', fontSize: '0.72rem' }}
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this stock movement? Product stock will be adjusted.')) {
                                  deleteMovementMutation.mutate(m.id);
                                }
                              }}
                              disabled={deleteMovementMutation.isPending}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : isLoadingLedger ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
            <span className="loading-spinner" style={{ marginRight: '0.5rem' }}></span> Loading stock history...
          </div>
        ) : movements.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
            No stock movements recorded for this product.
          </div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="hover-ledger-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>DATE</th>
                  <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>REF / ORDER ID</th>
                  <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>DESCRIPTION</th>
                  <th colSpan={2} style={{ textAlign: 'center', fontSize: '0.8rem' }}>STOCK MOVEMENT</th>
                  <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>FINAL STOCK</th>
                  <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '0.8rem' }}>ACTIONS</th>
                </tr>
                <tr>
                  <th style={{ color: 'var(--success)', textAlign: 'center', fontSize: '0.75rem' }}>IN</th>
                  <th style={{ color: 'var(--danger)', textAlign: 'center', fontSize: '0.75rem' }}>OUT</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let balance = 0;
                  return movements.map((m, idx) => {
                    const qty = m.quantity_change;
                    balance += qty;

                    let cleanStr = null;
                    if (typeof m.created_at === 'string') {
                      cleanStr = m.created_at.includes('T') ? m.created_at : m.created_at.replace(/-/g, '/');
                    } else if (typeof m.created_at === 'number') {
                      cleanStr = m.created_at;
                    }

                    const dateObj = cleanStr ? new Date(cleanStr) : null;
                    const dateStr = dateObj && !isNaN(dateObj.getTime())
                      ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
                      : (m.created_at || '-');

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
                      if (m.reference && m.reference.toLowerCase().includes('opname')) {
                        keterangan = 'STOCK OPNAME';
                      } else if (m.quantity_change > 0) {
                        keterangan = 'STOCK IN';
                      } else {
                        keterangan = 'STOCK OUT';
                      }
                    } else if (m.movement_type === 'sale') {
                      keterangan = m.platform_name ? m.platform_name.toUpperCase() : 'SALE';
                    } else if (m.movement_type === 'return') {
                      keterangan = 'RETURNED';
                    } else if (m.movement_type === 'write_off') {
                      keterangan = 'WRITE OFF';
                    }

                    const masuk = qty > 0 ? qty : '';
                    const keluar = qty < 0 ? Math.abs(qty) : '';

                    return (
                      <tr key={m.id || idx}>
                        {/* Date Column */}
                        <td style={{ textAlign: 'center' }}>
                          {editingField.movementId === m.id && editingField.field === 'date' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveField(m.id, 'date')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveField(m.id, 'date');
                                else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                              }}
                              autoFocus
                              style={{
                                width: '90px',
                                fontSize: '0.75rem',
                                padding: '0.1rem 0.2rem',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '3px',
                                textAlign: 'center'
                              }}
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingField({ movementId: m.id, field: 'date' });
                                setEditValue(dateStr);
                              }}
                              style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }}
                              title="Click to edit date"
                            >
                              {dateStr}
                            </span>
                          )}
                        </td>

                        {/* Ref / Order ID Column */}
                        <td>
                          {editingField.movementId === m.id && editingField.field === 'reference' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveField(m.id, 'reference')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveField(m.id, 'reference');
                                else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                              }}
                              autoFocus
                              style={{
                                width: '120px',
                                fontSize: '0.75rem',
                                padding: '0.1rem 0.2rem',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '3px',
                                fontFamily: 'monospace'
                              }}
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingField({ movementId: m.id, field: 'reference' });
                                setEditValue(m.reference || '');
                              }}
                              style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)', fontFamily: 'monospace', fontSize: '0.72rem' }}
                              title="Click to edit Ref / Order ID"
                            >
                              {noSj || '-'}
                            </span>
                          )}
                        </td>

                        {/* Description Column */}
                        <td>
                          {editingField.movementId === m.id && editingField.field === 'type' ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveField(m.id, 'type')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveField(m.id, 'type');
                                else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                              }}
                              autoFocus
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.1rem',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '3px'
                              }}
                            >
                              <option value="initial">STOCK OPNAME</option>
                              <option value="manual_adjust">MANUAL ADJUST</option>
                              <option value="sale">SALE</option>
                              <option value="return">RETURNED</option>
                              <option value="write_off">WRITE OFF</option>
                            </select>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingField({ movementId: m.id, field: 'type' });
                                setEditValue(m.movement_type);
                              }}
                              style={{ cursor: 'pointer' }}
                              title="Click to edit type"
                            >
                              <span className="status-tag info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', display: 'inline-block', borderBottom: '1px dashed var(--text-muted)' }}>
                                {keterangan}
                              </span>
                            </span>
                          )}
                        </td>

                        {/* IN Column */}
                        <td style={{ color: 'var(--success)', fontWeight: 600, textAlign: 'center' }}>
                          {editingField.movementId === m.id && editingField.field === 'qty' && qty >= 0 ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveField(m.id, 'qty')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveField(m.id, 'qty');
                                else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                              }}
                              autoFocus
                              style={{
                                width: '60px',
                                fontSize: '0.75rem',
                                padding: '0.1rem 0.2rem',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '3px',
                                textAlign: 'center'
                              }}
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingField({ movementId: m.id, field: 'qty' });
                                setEditValue(String(qty));
                              }}
                              style={{ cursor: 'pointer', borderBottom: qty > 0 ? '1px dashed var(--success)' : 'none' }}
                              title="Click to edit quantity"
                            >
                              {masuk || (qty === 0 ? '0' : '')}
                            </span>
                          )}
                        </td>

                        {/* OUT Column */}
                        <td style={{ color: 'var(--danger)', fontWeight: 600, textAlign: 'center' }}>
                          {editingField.movementId === m.id && editingField.field === 'qty' && qty < 0 ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSaveField(m.id, 'qty')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveField(m.id, 'qty');
                                else if (e.key === 'Escape') setEditingField({ movementId: null, field: null });
                              }}
                              autoFocus
                              style={{
                                width: '60px',
                                fontSize: '0.75rem',
                                padding: '0.1rem 0.2rem',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '3px',
                                textAlign: 'center'
                              }}
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingField({ movementId: m.id, field: 'qty' });
                                setEditValue(String(qty));
                              }}
                              style={{ cursor: 'pointer', borderBottom: qty < 0 ? '1px dashed var(--danger)' : 'none' }}
                              title="Click to edit quantity"
                            >
                              {keluar}
                            </span>
                          )}
                        </td>

                        {/* Final Stock Column */}
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>{balance}</td>

                        {/* Actions Column */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger)', padding: '0.1rem 0.4rem', fontSize: '0.72rem' }}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this stock movement? Product stock will be adjusted.')) {
                                deleteMovementMutation.mutate(m.id);
                              }
                            }}
                            disabled={deleteMovementMutation.isPending}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
