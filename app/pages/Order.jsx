import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { showToast } from '../utils/toast';

export default function Order() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [systemStatusFilter, setSystemStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Fetch all orders
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['ordersList'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders list');
      return res.json();
    }
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast('Error', 'Failed to load orders list', 'error');
    }
  }, [error]);

  const toggleExpandOrder = (id) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    // Search filter
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      (o.order_id || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.resi_number || '').toLowerCase().includes(q) ||
      (o.product_name_raw || '').toLowerCase().includes(q) ||
      (o.expedition || '').toLowerCase().includes(q)
    );

    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (o.order_status || '').toLowerCase() === statusFilter.toLowerCase();

    // System Status filter
    const matchesSystemStatus = systemStatusFilter === 'all' || 
      (o.system_status || '').toLowerCase() === systemStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSystemStatus;
  });

  // Unique status values for filter dropdown
  const uniqueStatuses = [...new Set(orders.map(o => o.order_status).filter(Boolean))];
  const uniqueSystemStatuses = ['normal', 'needs_review', 'resolved'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Search & Filters Card */}
      <div className="section-card" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Imported Orders</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>View, search, and track all imported orders, their delivery details, and mapped products.</p>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search ID, customer, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                paddingLeft: '2.5rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                transition: 'var(--transition)'
              }}
            />
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '0.9rem' }}>🔍</span>
          </div>

          {/* Marketplace Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* System Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>System:</span>
            <select
              value={systemStatusFilter}
              onChange={(e) => setSystemStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All System Statuses</option>
              {uniqueSystemStatuses.map(status => (
                <option key={status} value={status}>{status === 'needs_review' ? 'Needs Review' : status.charAt(0).toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table Section */}
      <div className="section-card">
        <div className="section-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h2>Order Listing ({filteredOrders.length})</h2>
        </div>
        <div className="table-wrapper">
          <table style={{ borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer Info</th>
                <th>Raw Product Name</th>
                <th>Price</th>
                <th>Marketplace Status</th>
                <th>System Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', py: '2.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                      <div className="loading-spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
                      <span style={{ fontSize: '0.85rem' }}>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', py: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '3rem 0' }}>
                    No orders matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isExpanded = expandedOrders.has(o.id);
                  let systemTagClass = 'info';
                  if (o.system_status === 'needs_review') systemTagClass = 'warning';
                  else if (o.system_status === 'resolved') systemTagClass = 'success';

                  return (
                    <React.Fragment key={o.id}>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'pointer' }} onClick={() => toggleExpandOrder(o.id)}>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                          <span style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s ease' }}>
                            ▶
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {o.order_id}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {o.order_date || '-'}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{o.customer_name || 'Anonymous'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', marginTop: '0.1rem' }}>
                            <span>🚚 {o.expedition || 'Courier'}</span>
                            {o.resi_number && (
                              <>
                                <span style={{ opacity: 0.3 }}>|</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>{o.resi_number}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.product_name_raw}>
                          <span style={{ fontWeight: '600', marginRight: '0.35rem', color: 'var(--text-primary)' }}>({o.quantity}x)</span>
                          {o.product_name_raw}
                        </td>
                        <td style={{ fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          Rp {(o.price || 0).toLocaleString('id-ID')}
                        </td>
                        <td>
                          <span className="status-tag info" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                            {o.order_status}
                          </span>
                        </td>
                        <td>
                          <span className={`status-tag ${systemTagClass}`} style={{ fontSize: '0.75rem' }}>
                            {o.system_status === 'needs_review' ? 'Needs Review' : o.system_status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td></td>
                          <td colSpan={7} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 var(--border-radius-md) var(--border-radius-md)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: '0.05em' }}>
                                Mapped Inventory Deductions
                              </div>
                              {o.items && o.items.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {o.items.map(item => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.6rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', fontSize: '0.78rem' }}>
                                      <span style={{ color: 'var(--accent-color)', fontWeight: '700' }}>{item.quantity}x</span>
                                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.product_name}</span>
                                      {item.product_model && <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({item.product_model})</span>}
                                      <span className="status-tag success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.25rem', height: 'auto', lineHeight: 1 }}>
                                        {item.parse_source}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--danger)', fontSize: '0.78rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  ⚠️ No inventory mapping matches. This order is unmapped!
                                </span>
                              )}
                              
                              {o.resolution_notes && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--warning)' }}>
                                  <strong>Resolution Notes:</strong> {o.resolution_notes}
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>SKU Reference</div>
                                  <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{o.sku_ref || '-'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Parent SKU (SKU Induk)</div>
                                  <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{o.parent_sku || '-'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Cancellation Reason</div>
                                  <div style={{ fontSize: '0.8rem', color: o.cancellation_reason ? 'var(--danger)' : 'var(--text-primary)' }}>{o.cancellation_reason || '-'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Cancel/Return Status</div>
                                  <div style={{ fontSize: '0.8rem', color: o.cancel_return_status ? 'var(--warning)' : 'var(--text-primary)', fontWeight: o.cancel_return_status ? '600' : 'normal' }}>{o.cancel_return_status || '-'}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
