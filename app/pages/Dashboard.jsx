import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { showToast } from '../utils/toast';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
                  <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                </div>
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-16 mt-4 mb-2"></div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
          <Card className="animate-pulse h-80 lg:col-span-3 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-48"></div>
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
            </div>
            <div className="space-y-3 flex-1 justify-center py-4">
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
            </div>
          </Card>
          <Card className="animate-pulse h-80 lg:col-span-2 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-36"></div>
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
            </div>
            <div className="space-y-3 flex-1 justify-center py-4">
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
              <div className="h-8 bg-zinc-100 dark:bg-zinc-900 rounded w-full"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Error/Empty state
  if (error || !data) {
    return (
      <div 
        className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800"
        role="alert"
      >
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full mb-4">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 mb-1">Failed to Load Dashboard</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
          There was an error communicating with the stock database. Please check your network connection or try reloading.
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const lowStockCount = data.low_stock_count || 0;
  const pendingReviewCount = data.pending_review_count || 0;
  const ambiguousCount = data.ambiguous_count || 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Cards Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Products */}
        <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Products</CardTitle>
            <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-zinc-500 border border-zinc-100 dark:border-zinc-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{data.total_products}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Match models registered</p>
          </CardContent>
        </Card>

        {/* Card 2: Low Stock */}
        <Card className={`transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${lowStockCount > 0 ? 'border-red-500/50 shadow-sm shadow-red-500/10' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Low Stock Alert</CardTitle>
            <div className={`p-2 rounded-lg border ${
              lowStockCount > 0 
                ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border-red-100 dark:border-red-900/30' 
                : 'bg-green-50 dark:bg-green-950/20 text-green-500 border-green-100 dark:border-green-900/30'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{lowStockCount}</div>
            <p className={`text-xs font-medium mt-1 ${lowStockCount > 0 ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {lowStockCount > 0 ? `⚠️ ${lowStockCount} items below threshold` : 'All stock levels healthy'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Review */}
        <Card className={`transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${pendingReviewCount > 0 ? 'border-amber-500/50 shadow-sm shadow-amber-500/10' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pending Review</CardTitle>
            <div className={`p-2 rounded-lg border ${
              pendingReviewCount > 0 
                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500 border-amber-100 dark:border-amber-900/30' 
                : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{pendingReviewCount}</div>
            <p className={`text-xs font-medium mt-1 ${pendingReviewCount > 0 ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {pendingReviewCount > 0 ? `⚠️ ${pendingReviewCount} orders require action` : 'No cancelled orders pending'}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Ambiguous Items */}
        <Card className={`transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${ambiguousCount > 0 ? 'border-amber-500/50 shadow-sm shadow-amber-500/10' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ambiguous Items</CardTitle>
            <div className={`p-2 rounded-lg border ${
              ambiguousCount > 0 
                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500 border-amber-100 dark:border-amber-900/30' 
                : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{ambiguousCount}</div>
            <p className={`text-xs font-medium mt-1 ${ambiguousCount > 0 ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {ambiguousCount > 0 ? `⚠️ ${ambiguousCount} items need mapping` : 'Descriptions clean'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Recent Reviews Table */}
        <Card className="lg:col-span-3 flex flex-col h-full border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
            <CardTitle className="text-lg">Orders Awaiting Review</CardTitle>
            <Link to="/review" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-8 px-3">
              View All
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20">
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400">Order ID</th>
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400">Product Raw</th>
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400 text-right">Qty</th>
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400">Expedition</th>
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {(!data.recent_reviews || data.recent_reviews.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-zinc-500 py-12">
                      No flagged orders needing review.
                    </td>
                  </tr>
                ) : (
                  data.recent_reviews.map((o) => (
                    <tr key={o.order_id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="p-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {o.order_id}
                      </td>
                      <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 max-w-[150px] truncate" title={o.product_name_raw}>
                        {o.product_name_raw}
                      </td>
                      <td className="p-4 text-right">
                        {o.quantity}
                      </td>
                      <td className="p-4 text-zinc-500 dark:text-zinc-400">
                        {o.expedition || '-'}
                      </td>
                      <td className="p-4 text-center">
                        <Link to="/review" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-8 px-3 text-xs">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Recent Imports Table */}
        <Card className="lg:col-span-2 flex flex-col h-full border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
            <CardTitle className="text-lg">Imports History</CardTitle>
            <Link to="/import" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-8 px-3">
              New Import
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20">
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400">Date</th>
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400">Source</th>
                  <th className="h-10 px-4 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {(!data.recent_imports || data.recent_imports.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="text-center text-sm text-zinc-500 py-12">
                      No import history found.
                    </td>
                  </tr>
                ) : (
                  data.recent_imports.map((s) => {
                    let statusClass = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
                    if (s.status === 'applied') statusClass = 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30';
                    if (s.status === 'cancelled') statusClass = 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30';

                    const dateStr = s.created_at
                      ? new Date(typeof s.created_at === 'string' ? s.created_at.replace(/-/g, '/') : s.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';

                    return (
                      <tr key={s.id || s.created_at} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="p-4 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]" title={s.filename}>
                          {s.filename || s.template_name}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                            {s.total_rows} ({s.status})
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
