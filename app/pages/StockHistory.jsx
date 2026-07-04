import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { showToast } from '../utils/toast';

export default function StockHistory() {
  const queryClient = useQueryClient();

  // Table state
  const [sorting, setSorting] = useState([{ id: 'id', desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });

  // Fetch ledger history
  const { data: ledger = [], isLoading, error } = useQuery({
    queryKey: ['ledgerHistory'],
    queryFn: async () => {
      const res = await fetch('/api/products/ledger');
      if (!res.ok) throw new Error('Failed to fetch stock ledger');
      return res.json();
    }
  });

  useEffect(() => {
    if (error) {
      showToast('Error', 'Failed to load stock ledger', 'error');
    }
  }, [error]);

  // REST resync invalidations
  useEffect(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['ledgerHistory'] });
    };

    window.addEventListener('resync-data', handleResync);

    return () => {
      window.removeEventListener('resync-data', handleResync);
    };
  }, [queryClient]);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-zinc-500">{getValue()}</span>
    },
    {
      id: 'product',
      header: 'Product',
      accessorFn: (row) => row.name ? `${row.name} (${row.model || ''})` : `Product #${row.product_id}`,
      cell: ({ getValue }) => <strong className="text-sm text-zinc-900 dark:text-zinc-100">{getValue()}</strong>,
    },
    {
      accessorKey: 'quantity_change',
      header: 'Quantity Change',
      cell: ({ row, getValue }) => {
        const change = parseInt(getValue(), 10);
        const changeText = change > 0 ? `+${change}` : `${change}`;
        
        let colorClass = 'text-amber-500';
        if (row.original.movement_type === 'initial') {
          colorClass = 'text-green-600 dark:text-green-400';
        } else if (row.original.movement_type === 'return') {
          colorClass = 'text-green-600 dark:text-green-400';
        } else if (row.original.movement_type === 'sale') {
          colorClass = 'text-red-500';
        } else if (row.original.movement_type === 'write_off') {
          colorClass = 'text-amber-500';
        } else if (row.original.movement_type === 'manual_adjust') {
          colorClass = change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500';
        }

        return <span className={`font-bold text-sm ${colorClass}`}>{changeText}</span>;
      },
    },
    {
      accessorKey: 'movement_type',
      header: 'Type',
      cell: ({ row, getValue }) => {
        const type = getValue();
        const change = parseInt(row.original.quantity_change, 10);
        let tagClass = 'status-tag info';
        let typeLabel = type;

        if (type === 'initial') {
          tagClass = 'status-tag success';
          typeLabel = 'Initial';
        } else if (type === 'return') {
          tagClass = 'status-tag success';
          typeLabel = 'Return';
        } else if (type === 'sale') {
          tagClass = 'status-tag danger';
          typeLabel = 'Sale';
        } else if (type === 'write_off') {
          tagClass = 'status-tag warning';
          typeLabel = 'Write-Off';
        } else if (type === 'manual_adjust') {
          tagClass = change >= 0 ? 'status-tag success' : 'status-tag danger';
          typeLabel = 'Adjustment';
        }

        return <span className={`${tagClass} text-xs font-semibold px-2.5 py-0.5 rounded-full`}>{typeLabel}</span>;
      },
    },
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ getValue }) => (
        <span className="text-zinc-500 dark:text-zinc-400 text-xs">
          {getValue() || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'username',
      header: 'User',
      cell: ({ getValue }) => <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{getValue() || 'System'}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ getValue }) => {
        const val = getValue();
        const cleanStr = typeof val === 'string' && !val.includes('T') ? val.replace(/-/g, '/') : val;
        return <span className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(cleanStr).toLocaleString()}</span>;
      },
    },
  ], []);

  // Init TanStack Table
  const table = useReactTable({
    data: ledger,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="section-card flex flex-col h-full">
        <div className="section-header pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-900">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Stock Movement Ledger</h2>
        </div>
        
        <div className="table-wrapper overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-900">
                {table.getHeaderGroups().map((headerGroup) => (
                  headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={`py-3 px-4 text-xs font-bold text-zinc-500 tracking-wider ${
                          isSortable ? 'cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && (
                            <span className="text-[10px] transition-opacity duration-150" style={{ opacity: sortDir ? 1 : 0.35 }}>
                              {sortDir === 'asc' ? ' ▲' : sortDir === 'desc' ? ' ▼' : ' ↕'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })
                ))}
              </tr>
            </thead>
            <tbody id="stock-ledger-table-body">
              {isLoading ? (
                // Table row skeleton pulse
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-900/40 animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-8"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-48"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-12"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div></td>
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div></td>
                  </tr>
                ))
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-zinc-400 dark:text-zinc-500 py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      No stock movements recorded yet.
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-50 dark:border-zinc-900/40 hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors duration-150">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {ledger.length > 0 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Showing <span className="font-semibold text-zinc-700 dark:text-zinc-300">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to{' '}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, ledger.length)}
              </span> of{' '}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{ledger.length}</span> movements
            </div>
            <div className="flex gap-2 items-center">
              <button
                className="btn btn-secondary btn-sm text-xs px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 px-1">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <button
                className="btn btn-secondary btn-sm text-xs px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
