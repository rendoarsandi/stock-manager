import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { showToast } from '../utils/toast';

export default function Order() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [systemStatusFilter, setSystemStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Reset page when filters change
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSystemStatusChange = (val) => {
    setSystemStatusFilter(val);
    setPage(1);
  };

  // Fetch paginated orders
  const { data = {}, isLoading, error } = useQuery({
    queryKey: ['ordersList', page, limit, searchQuery, statusFilter, systemStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusFilter,
        system_status: systemStatusFilter
      });
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders list');
      return res.json();
    }
  });

  const orders = data.orders || [];
  const total = data.total || 0;
  const totalPages = data.totalPages || 0;
  const uniqueStatuses = data.uniqueStatuses || [];
  const uniqueSystemStatuses = ['normal', 'needs_review', 'resolved'];

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
              onChange={(e) => handleSearchChange(e.target.value)}
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
              onChange={(e) => handleStatusChange(e.target.value)}
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
              onChange={(e) => handleSystemStatusChange(e.target.value)}
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
          <h2>Order Listing ({total})</h2>
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                      <div className="loading-spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
                      <span style={{ fontSize: '0.85rem' }}>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No orders matching criteria found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
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
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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

        {/* Premium Pagination Footer */}
        {!isLoading && total > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 0.5rem 0 0.5rem',
            marginTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Range and Total Info */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{' '}
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{Math.min(page * limit, total)}</span> of{' '}
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{total}</span> orders
            </div>

            {/* Limit Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                style={{
                  padding: '0.35rem 1.75rem 0.35rem 0.6rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.6rem center',
                  backgroundSize: '0.75rem'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Navigation Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {/* First Page */}
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.4 : 1,
                  transition: 'var(--transition)',
                  fontSize: '0.85rem'
                }}
                title="First Page"
              >
                «
              </button>

              {/* Prev */}
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 0.75rem',
                  height: '2rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.4 : 1,
                  transition: 'var(--transition)',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}
              >
                Prev
              </button>

              {/* Page Numbers */}
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let start = Math.max(1, page - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible - 1);

                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1);
                }

                if (start > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => setPage(1)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: page === 1 ? 'var(--accent-color)' : 'var(--bg-secondary)',
                        color: page === 1 ? 'var(--bg-secondary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        fontSize: '0.85rem',
                        fontWeight: page === 1 ? '600' : 'normal'
                      }}
                    >
                      1
                    </button>
                  );
                  if (start > 2) {
                    pages.push(
                      <span key="dots-start" style={{ padding: '0 0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        ...
                      </span>
                    );
                  }
                }

                for (let i = start; i <= end; i++) {
                  const isCurrent = i === page;
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: isCurrent ? 'var(--accent-color)' : 'var(--bg-secondary)',
                        color: isCurrent ? 'var(--bg-secondary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        fontSize: '0.85rem',
                        fontWeight: isCurrent ? '600' : 'normal'
                      }}
                    >
                      {i}
                    </button>
                  );
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    pages.push(
                      <span key="dots-end" style={{ padding: '0 0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        ...
                      </span>
                    );
                  }
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setPage(totalPages)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: page === totalPages ? 'var(--accent-color)' : 'var(--bg-secondary)',
                        color: page === totalPages ? 'var(--bg-secondary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        fontSize: '0.85rem',
                        fontWeight: page === totalPages ? '600' : 'normal'
                      }}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pages;
              })()}

              {/* Next */}
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages || totalPages === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 0.75rem',
                  height: '2rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: (page === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                  opacity: (page === totalPages || totalPages === 0) ? 0.4 : 1,
                  transition: 'var(--transition)',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}
              >
                Next
              </button>

              {/* Last Page */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages || totalPages === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: (page === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                  opacity: (page === totalPages || totalPages === 0) ? 0.4 : 1,
                  transition: 'var(--transition)',
                  fontSize: '0.85rem'
                }}
                title="Last Page"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
