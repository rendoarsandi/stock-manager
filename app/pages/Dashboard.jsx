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
        <div className="h-16 bg-slate-200/50 dark:bg-[#131b2e] rounded-2xl animate-pulse" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start">
                  <div className="h-3.5 bg-slate-200 dark:bg-[#1f2b44] rounded w-20" />
                  <div className="h-8 w-8 bg-slate-200 dark:bg-[#1f2b44] rounded-xl" />
                </div>
                <div className="h-7 bg-slate-200 dark:bg-[#1f2b44] rounded w-14 mt-4 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-[#1f2b44] rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
          <Card className="animate-pulse h-80 lg:col-span-3 p-6" />
          <Card className="animate-pulse h-80 lg:col-span-2 p-6" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div 
        className="flex flex-col items-center justify-center p-10 text-center border border-dashed rounded-2xl border-red-300 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 my-4"
        role="alert"
      >
        <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-2xl mb-4 shadow-xs">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Database Sync Error</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mb-4">
          Could not communicate with the SQLite database. Try refreshing the query.
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
  const totalProducts = data.total_products || 0;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <Link
          to="/products"
          className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 dark:border-[#26334d] bg-white dark:bg-[#131b2e] hover:border-sky-500/60 dark:hover:border-sky-500/60 hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">New Product</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Add SKU to catalog</div>
          </div>
        </Link>

        <Link
          to="/import"
          className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 dark:border-[#26334d] bg-white dark:bg-[#131b2e] hover:border-indigo-500/60 dark:hover:border-indigo-500/60 hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Import Excel</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Marketplace reports</div>
          </div>
        </Link>

        <Link
          to="/products/in-out"
          className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 dark:border-[#26334d] bg-white dark:bg-[#131b2e] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Stock In / Out</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Manual movement</div>
          </div>
        </Link>

        <Link
          to="/opname"
          className="flex items-center gap-2.5 p-3 sm:p-3.5 rounded-xl border border-slate-200/90 dark:border-[#26334d] bg-white dark:bg-[#131b2e] hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:shadow-sm transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Stock Opname</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Audit physical count</div>
          </div>
        </Link>
      </div>

      {/* Cards Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        
        {/* Card 1: Total Products */}
        <Link to="/products" className="block focus:outline-none">
          <Card className="hover:border-sky-500/60 dark:hover:border-sky-500/60 hover:shadow-md transition-all h-full cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-2">
              <CardTitle className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Products
              </CardTitle>
              <div className="p-2 sm:p-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-100 dark:border-sky-800/50 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">{totalProducts}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between font-medium">
                <span>SKU catalog</span>
                <span className="text-sky-600 dark:text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">Manage →</span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: Low Stock */}
        <Link to="/products" className="block focus:outline-none">
          <Card className={`hover:shadow-md transition-all h-full cursor-pointer group ${
            lowStockCount > 0 
              ? 'border-red-500/70 bg-red-50/30 dark:bg-red-950/20 dark:border-red-800/70' 
              : 'hover:border-emerald-500/60 dark:hover:border-emerald-500/60'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-2">
              <CardTitle className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Low Stock Alert
              </CardTitle>
              <div className={`p-2 sm:p-2.5 rounded-xl border group-hover:scale-105 transition-transform ${
                lowStockCount > 0 
                  ? 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700/60' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-50'}`}>
                {lowStockCount}
              </div>
              <p className={`text-[11px] mt-1 font-semibold ${lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {lowStockCount > 0 ? `⚠️ ${lowStockCount} below threshold` : '✓ Stock levels healthy'}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Pending Review */}
        <Link to="/review" className="block focus:outline-none">
          <Card className={`hover:shadow-md transition-all h-full cursor-pointer group ${
            pendingReviewCount > 0 
              ? 'border-amber-500/70 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-800/70' 
              : 'hover:border-amber-500/60 dark:hover:border-amber-500/60'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-2">
              <CardTitle className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Review
              </CardTitle>
              <div className={`p-2 sm:p-2.5 rounded-xl border group-hover:scale-105 transition-transform ${
                pendingReviewCount > 0 
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/60' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${pendingReviewCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-50'}`}>
                {pendingReviewCount}
              </div>
              <p className={`text-[11px] mt-1 font-semibold ${pendingReviewCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {pendingReviewCount > 0 ? `⚠️ ${pendingReviewCount} orders pending` : 'No flagged orders'}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Card 4: SKU Mappings */}
        <Link to="/settings" className="block focus:outline-none">
          <Card className="hover:shadow-md transition-all h-full cursor-pointer group hover:border-purple-500/60 dark:hover:border-purple-500/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-2">
              <CardTitle className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Direct SKU Match
              </CardTitle>
              <div className="p-2 sm:p-2.5 rounded-xl border group-hover:scale-105 transition-transform bg-slate-100 dark:bg-slate-800/80 text-slate-500 border-slate-200 dark:border-slate-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                100%
              </div>
              <p className="text-[11px] mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ SKU Direct Mode Active
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Stock Movement Trends */}
        <Card className="lg:col-span-3 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-[#26334d]">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Stock Movement Trends</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Flow of inventory in & out over the last 30 days</p>
            </div>
            <div className="flex gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> In
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Out
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center p-4 sm:p-6">
            {(!data.stock_trends || data.stock_trends.length === 0) ? (
              <div className="py-8 sm:py-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-[#26334d] bg-slate-50/50 dark:bg-[#0e1526]/50 rounded-xl p-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#1a243b] flex items-center justify-center text-slate-400 dark:text-slate-400 mb-3 border border-slate-200/80 dark:border-[#2e3e5f]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No Recent Movement Trends</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mb-3.5">
                  Incoming shipments and dispatches will generate trend curves here.
                </p>
                <Link
                  to="/products/in-out"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                >
                  Record In / Out Movement
                </Link>
              </div>
            ) : (() => {
              const trends = data.stock_trends;
              const maxVal = Math.max(...trends.flatMap(t => [t.stock_in, t.stock_out]), 10);
              const padding = { top: 15, right: 15, bottom: 30, left: 40 };
              const chartWidth = 600 - padding.left - padding.right;
              const chartHeight = 180 - padding.top - padding.bottom;

              const pointsIn = trends.map((t, idx) => {
                const x = padding.left + (idx / Math.max(trends.length - 1, 1)) * chartWidth;
                const y = padding.top + chartHeight - (t.stock_in / maxVal) * chartHeight;
                return { x, y, date: t.movement_date, val: t.stock_in };
              });

              const pointsOut = trends.map((t, idx) => {
                const x = padding.left + (idx / Math.max(trends.length - 1, 1)) * chartWidth;
                const y = padding.top + chartHeight - (t.stock_out / maxVal) * chartHeight;
                return { x, y, date: t.movement_date, val: t.stock_out };
              });

              const pathD = (points) => {
                if (points.length === 0) return '';
                return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
              };

              const areaD = (points) => {
                if (points.length === 0) return '';
                const first = points[0];
                const last = points[points.length - 1];
                const baseLineY = padding.top + chartHeight;
                return `M ${first.x} ${baseLineY} L ${first.x} ${first.y} ` + 
                       points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + 
                       ` L ${last.x} ${baseLineY} Z`;
              };

              return (
                <div className="w-full">
                  <svg viewBox="0 0 600 180" className="w-full h-auto overflow-visible">
                    <defs>
                      <linearGradient id="gradientIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="gradientOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                      const y = padding.top + ratio * chartHeight;
                      const val = Math.round(maxVal * (1 - ratio));
                      return (
                        <g key={i}>
                          <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="currentColor" className="text-slate-200 dark:text-[#26334d]" strokeWidth="1" strokeDasharray="3 3" />
                          <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" className="fill-slate-400 dark:fill-slate-400 font-medium">{val}</text>
                        </g>
                      );
                    })}

                    {/* Date labels at bottom */}
                    {trends.filter((_, i) => i % Math.max(Math.round(trends.length / 5), 1) === 0).map((t, idx) => {
                      const itemIdx = trends.indexOf(t);
                      const x = padding.left + (itemIdx / Math.max(trends.length - 1, 1)) * chartWidth;
                      const dateParts = t.movement_date.split('-');
                      const displayDate = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : t.movement_date;
                      return (
                        <text key={idx} x={x} y={padding.top + chartHeight + 18} textAnchor="middle" fontSize="10" className="fill-slate-400 dark:fill-slate-400 font-semibold">{displayDate}</text>
                      );
                    })}

                    {/* Area Gradients */}
                    {pointsIn.length > 0 && <path d={areaD(pointsIn)} fill="url(#gradientIn)" />}
                    {pointsOut.length > 0 && <path d={areaD(pointsOut)} fill="url(#gradientOut)" />}

                    {/* Line paths */}
                    {pointsIn.length > 0 && <path d={pathD(pointsIn)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                    {pointsOut.length > 0 && <path d={pathD(pointsOut)} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                    {/* Decorative dots for latest points */}
                    {trends.length > 0 && (
                      <>
                        <circle cx={pointsIn[pointsIn.length - 1].x} cy={pointsIn[pointsIn.length - 1].y} r="4.5" fill="#10b981" stroke="#fff" strokeWidth="2" />
                        <circle cx={pointsOut[pointsOut.length - 1].x} cy={pointsOut[pointsOut.length - 1].y} r="4.5" fill="#f43f5e" stroke="#fff" strokeWidth="2" />
                      </>
                    )}
                  </svg>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Top Moving Products */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#26334d]">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Top Moving Products</CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Highest sales volume products in 30 days</p>
          </CardHeader>
          <CardContent className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
            {(!data.top_moving_products || data.top_moving_products.length === 0) ? (
              <div className="py-8 sm:py-10 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-[#26334d] bg-slate-50/50 dark:bg-[#0e1526]/50 rounded-xl p-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#1a243b] flex items-center justify-center text-slate-400 dark:text-slate-400 mb-3 border border-slate-200/80 dark:border-[#2e3e5f]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No Product Sales Yet</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mb-3.5">
                  Top performing items and sales volume leaderboards will appear here.
                </p>
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-[#1f2b44] dark:hover:bg-[#283858] text-slate-800 dark:text-slate-100 transition-colors"
                >
                  View Product Catalog
                </Link>
              </div>
            ) : (() => {
              const items = data.top_moving_products;
              const maxVol = Math.max(...items.map(item => item.sales_volume), 1);
              return (
                <div className="space-y-3.5">
                  {items.map((item, idx) => {
                    const widthPercent = Math.max((item.sales_volume / maxVol) * 100, 8);
                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="truncate pr-3">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] mr-1.5 font-bold">
                              {idx + 1}
                            </span>
                            {item.name} {item.model ? `(${item.model})` : ''}
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">{item.sales_volume} sold</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Main Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Recent Reviews Table */}
        <Card className="lg:col-span-3 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-[#26334d] pb-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Orders Awaiting Review</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Orders flagged for split or manual resolution</p>
            </div>
            <Link 
              to="/review" 
              className="inline-flex items-center justify-center rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#26334d] bg-white dark:bg-[#1a243b] hover:bg-slate-50 dark:hover:bg-[#22304e] text-slate-700 dark:text-slate-200 h-8 px-3 transition-colors shadow-2xs"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-x-auto">
            {(!data.recent_reviews || data.recent_reviews.length === 0) ? (
              <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 border border-emerald-100 dark:border-emerald-800/50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">No Orders Needing Review</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  All imported orders have matching SKUs and clean fulfillment statuses.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#26334d] bg-slate-50/75 dark:bg-[#0e1526]">
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order ID</th>
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product Raw</th>
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 text-right uppercase tracking-wider">Qty</th>
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expedition</th>
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 text-center uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#26334d]">
                  {data.recent_reviews.map((o) => (
                    <tr key={o.order_id} className="hover:bg-slate-50/80 dark:hover:bg-[#1a243b]/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 font-medium">
                        {o.order_id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate" title={o.product_name_raw}>
                        {o.product_name_raw}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                        {o.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {o.expedition || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link 
                          to="/review" 
                          className="inline-flex items-center justify-center rounded-lg font-semibold border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/70 text-sky-700 dark:text-sky-300 h-7 px-2.5 text-xs transition-colors"
                        >
                          Resolve
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Recent Imports Table */}
        <Card className="lg:col-span-2 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-[#26334d] pb-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Imports History</CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Recent batch synchronization logs</p>
            </div>
            <Link 
              to="/import" 
              className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white h-8 px-3 transition-colors shadow-xs"
            >
              + New Import
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-x-auto">
            {(!data.recent_imports || data.recent_imports.length === 0) ? (
              <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2.5 border border-sky-100 dark:border-sky-800/50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">No Import Records Found</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
                  Upload marketplace Excel or CSV files to populate inventory.
                </p>
                <Link
                  to="/import"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-[#1f2b44] dark:hover:bg-[#283858] text-slate-800 dark:text-slate-100 transition-colors"
                >
                  Start Import →
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#26334d] bg-slate-50/75 dark:bg-[#0e1526]">
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
                    <th className="h-9 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#26334d]">
                  {data.recent_imports.map((s) => {
                    let statusClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                    if (s.status === 'applied') statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50';
                    if (s.status === 'cancelled') statusClass = 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/50';

                    const dateStr = s.created_at
                      ? new Date(typeof s.created_at === 'string' ? s.created_at.replace(/-/g, '/') : s.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';

                    return (
                      <tr key={s.id || s.created_at} className="hover:bg-slate-50/80 dark:hover:bg-[#1a243b]/60 transition-colors">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[130px]" title={s.filename}>
                          {s.filename || s.template_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${statusClass}`}>
                            {s.total_rows} ({s.status})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
