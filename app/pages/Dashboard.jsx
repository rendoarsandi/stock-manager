import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { showToast } from '../utils/toast';

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) {
        throw new Error('Failed to load dashboard statistics');
      }
      return res.json();
    }
  });

  useEffect(() => {
    if (error) {
      console.error('Dashboard data load failed:', error);
      showToast('Error', 'Failed to retrieve dashboard stats', 'error');
    }
  }, [error]);

  useEffect(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    };

    window.addEventListener('resync-data', handleResync);

    return () => {
      window.removeEventListener('resync-data', handleResync);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
        Error loading dashboard statistics.
      </div>
    );
  }

  // Card conditions
  const lowStockCount = data.low_stock_count || 0;
  const pendingReviewCount = data.pending_review_count || 0;
  const ambiguousCount = data.ambiguous_count || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="dashboard-grid">
        {/* Card 1: Total Products */}
        <div className="card" id="card-products">
          <div className="card-title">Total Products</div>
          <div className="card-value" id="dash-total-products">{data.total_products}</div>
          <div className="card-subtitle">Match models registered</div>
        </div>

        {/* Card 2: Low Stock */}
        <div
          className="card"
          id="card-low-stock"
          style={lowStockCount > 0 ? { borderLeft: '4px solid var(--danger)' } : {}}
        >
          <div className="card-title">Low Stock Alert</div>
          <div className="card-value" id="dash-low-stock">{lowStockCount}</div>
          <div
            className="card-subtitle"
            id="dash-low-stock-sub"
            style={
              lowStockCount > 0
                ? { color: 'var(--danger)', fontWeight: '500' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {lowStockCount > 0
              ? `⚠️ ${lowStockCount} items below threshold`
              : 'All stock levels healthy'}
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div
          className="card"
          id="card-reviews"
          style={pendingReviewCount > 0 ? { borderLeft: '4px solid var(--warning)' } : {}}
        >
          <div className="card-title">Pending Review</div>
          <div className="card-value" id="dash-pending-review">{pendingReviewCount}</div>
          <div
            className="card-subtitle"
            id="dash-reviews-sub"
            style={
              pendingReviewCount > 0
                ? { color: 'var(--warning)', fontWeight: '500' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {pendingReviewCount > 0
              ? `⚠️ ${pendingReviewCount} orders require actions`
              : 'No cancelled orders pending'}
          </div>
        </div>

        {/* Card 4: Ambiguous Items */}
        <div
          className="card"
          id="card-ambiguous"
          style={ambiguousCount > 0 ? { borderLeft: '4px solid var(--warning)' } : {}}
        >
          <div className="card-title">Ambiguous Items</div>
          <div className="card-value" id="dash-ambiguous">{ambiguousCount}</div>
          <div
            className="card-subtitle"
            id="dash-ambiguous-sub"
            style={
              ambiguousCount > 0
                ? { color: 'var(--warning)', fontWeight: '500' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {ambiguousCount > 0
              ? `⚠️ ${ambiguousCount} items need mapping`
              : 'Descriptions clean'}
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        {/* Recent Reviews Table */}
        <div className="section-card">
          <div className="section-header">
            <h2>Recent Orders Awaiting Review</h2>
            <Link to="/review" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Product Raw</th>
                  <th>Qty</th>
                  <th>Expedition</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="dash-recent-reviews">
                {(!data.recent_reviews || data.recent_reviews.length === 0) ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      No flagged orders needing review.
                    </td>
                  </tr>
                ) : (
                  data.recent_reviews.map((o) => (
                    <tr key={o.order_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 500 }}>
                        {o.order_id}
                      </td>
                      <td
                        style={{
                          fontSize: '0.85rem',
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={o.product_name_raw}
                      >
                        {o.product_name_raw}
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.quantity}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {o.expedition || '-'}
                      </td>
                      <td>
                        <Link
                          to="/review"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Imports Table */}
        <div className="section-card">
          <div className="section-header">
            <h2>Recent Imports History</h2>
            <Link to="/import" className="btn btn-secondary btn-sm">New Import</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Filename</th>
                  <th>Rows</th>
                </tr>
              </thead>
              <tbody id="dash-recent-imports">
                {(!data.recent_imports || data.recent_imports.length === 0) ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      No import history found.
                    </td>
                  </tr>
                ) : (
                  data.recent_imports.map((s) => {
                    let statusTag = 'info';
                    if (s.status === 'applied') statusTag = 'success';
                    if (s.status === 'cancelled') statusTag = 'danger';

                    const dateStr = s.created_at
                      ? new Date(typeof s.created_at === 'string' ? s.created_at.replace(/-/g, '/') : s.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';

                    return (
                      <tr key={s.id || s.created_at}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {dateStr}
                        </td>
                        <td>
                          <span className="status-tag info" style={{ fontSize: '0.7rem' }}>
                            {s.template_name}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: '0.85rem',
                            maxWidth: '130px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={s.filename}
                        >
                          {s.filename}
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {s.total_rows} rows{' '}
                          <span className={`status-tag ${statusTag}`} style={{ fontSize: '0.65rem', marginLeft: '0.25rem' }}>
                            {s.status}
                          </span>
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
    </div>
  );
}
