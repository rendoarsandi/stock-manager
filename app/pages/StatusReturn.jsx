import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { showToast } from '../utils/toast';

export default function StatusReturn() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch returned orders
  const { data: returnedOrders = [], isLoading, error } = useQuery({
    queryKey: ['returnedOrders'],
    queryFn: async () => {
      const res = await fetch('/api/review/returned');
      if (!res.ok) throw new Error('Failed to fetch returned orders');
      return res.json();
    }
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast('Error', 'Failed to load returned orders', 'error');
    }
  }, [error]);

  // Filter returned orders
  const filteredOrders = returnedOrders.filter(o => {
    const q = searchQuery.toLowerCase();
    return (
      (o.order_id || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.product_name_raw || '').toLowerCase().includes(q) ||
      (o.resolution_notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Search Header Card */}
      <div className="section-card" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Returned Orders Logs</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>View all completed returns that have been processed and added back to inventory stock.</p>
        </div>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            placeholder="Search customer, order, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
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
      </div>

      {/* Returned Log Table Section */}
      <div className="section-card">
        <div className="section-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h2>Status Return Logs ({filteredOrders.length})</h2>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Info</th>
                <th>Raw Order Details</th>
                <th>Qty</th>
                <th>Resolved Items (Mapped)</th>
                <th>Return Resolution Notes</th>
                <th>Time Resolved</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', py: '2.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                      <div className="loading-spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
                      <span style={{ fontSize: '0.85rem' }}>Retrieving logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', py: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '3rem 0' }}>
                    No returned orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const resolvedItemsText = o.items && o.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {o.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>{item.quantity}x</span>
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }} className="truncate">{item.product_name}</span>
                          {item.product_model && <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({item.product_model})</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>None (Direct raw refund)</span>
                  );

                  return (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {o.order_id}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{o.customer_name || 'Anonymous Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>🚚 {o.expedition || 'Courier'}</span>
                          {o.resi_number && (
                            <>
                              <span style={{ opacity: 0.3 }}>|</span>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--accent-color)' }}>{o.resi_number}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.product_name_raw}>
                        {o.product_name_raw}
                      </td>
                      <td style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{o.quantity}</td>
                      <td>{resolvedItemsText}</td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '500', padding: '0.4rem 0.6rem', backgroundColor: 'var(--accent-light)', border: '1px solid rgba(var(--accent-color-rgb), 0.15)', borderRadius: 'var(--border-radius-md)', maxWidth: '280px', lineHeight: '1.4' }}>
                          {o.resolution_notes || 'No return notes provided.'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {o.resolved_at || o.created_at || 'Recently'}
                      </td>
                    </tr>
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
