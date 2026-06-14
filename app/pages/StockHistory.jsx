import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useWebSocket } from '../context/WebSocketContext';
import { showToast } from '../utils/toast';

export default function StockHistory() {
  const queryClient = useQueryClient();
  const { addWsListener } = useWebSocket();

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
    },
  });

  useEffect(() => {
    if (error) {
      showToast('Error', 'Failed to load stock ledger', 'error');
    }
  }, [error]);

  // WebSocket / resync invalidations
  useEffect(() => {
    const unsubscribe = addWsListener((msg) => {
      if (msg.type === 'MOVEMENT_CREATED') {
        queryClient.invalidateQueries({ queryKey: ['ledgerHistory'] });
      }
    });

    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['ledgerHistory'] });
    };

    window.addEventListener('resync-data', handleResync);

    return () => {
      unsubscribe();
      window.removeEventListener('resync-data', handleResync);
    };
  }, [addWsListener, queryClient]);

  // Columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      id: 'product',
      header: 'Product',
      accessorFn: (row) => row.name ? `${row.name} (${row.model || ''})` : `Product #${row.product_id}`,
      cell: ({ getValue }) => <strong>{getValue()}</strong>,
    },
    {
      accessorKey: 'quantity_change',
      header: 'Quantity Change',
      cell: ({ row, getValue }) => {
        const change = parseInt(getValue(), 10);
        const changeText = change > 0 ? `+${change}` : `${change}`;
        
        let color = 'var(--warning)';
        if (row.original.movement_type === 'initial') {
          color = 'var(--success)';
        } else if (row.original.movement_type === 'return') {
          color = 'var(--success)';
        } else if (row.original.movement_type === 'sale') {
          color = 'var(--danger)';
        } else if (row.original.movement_type === 'write_off') {
          color = 'var(--warning)';
        } else if (row.original.movement_type === 'manual_adjust') {
          color = change >= 0 ? 'var(--success)' : 'var(--danger)';
        }

        return <span style={{ fontWeight: 'bold', color }}>{changeText}</span>;
      },
    },
    {
      accessorKey: 'movement_type',
      header: 'Type',
      cell: ({ row, getValue }) => {
        const type = getValue();
        const change = parseInt(row.original.quantity_change, 10);
        let tagClass = 'info';
        let typeLabel = type;

        if (type === 'initial') {
          tagClass = 'success';
          typeLabel = 'Initial';
        } else if (type === 'return') {
          tagClass = 'success';
          typeLabel = 'Return';
        } else if (type === 'sale') {
          tagClass = 'danger';
          typeLabel = 'Sale';
        } else if (type === 'write_off') {
          tagClass = 'warning';
          typeLabel = 'Write-Off';
        } else if (type === 'manual_adjust') {
          tagClass = change >= 0 ? 'success' : 'danger';
          typeLabel = 'Adjustment';
        }

        return <span className={`status-tag ${tagClass}`}>{typeLabel}</span>;
      },
    },
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ getValue }) => (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {getValue() || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'username',
      header: 'User',
      cell: ({ getValue }) => getValue() || 'System',
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ getValue }) => {
        const val = getValue();
        const cleanStr = typeof val === 'string' && !val.includes('T') ? val.replace(/-/g, '/') : val;
        return new Date(cleanStr).toLocaleString();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-card">
      <div className="section-header">
        <h2>Stock Movement Ledger</h2>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      style={isSortable ? { cursor: 'pointer', userSelect: 'none' } : {}}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {isSortable && (
                        <span className="sort-icon" style={{ opacity: sortDir ? 1 : 0.35 }}>
                          {sortDir === 'asc' ? ' ▲' : sortDir === 'desc' ? ' ▼' : ' ↕'}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody id="stock-ledger-table-body">
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading ledger history...
                </td>
              </tr>
            ) : ledger.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No stock movements recorded yet.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
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
        <div
          className="pagination-controls"
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            marginTop: '1rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      )}
    </div>
  </div>
  );
}
