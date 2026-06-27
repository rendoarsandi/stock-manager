import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { showToast } from '../utils/toast';

export default function Products() {
  const queryClient = useQueryClient();

  // Search filter and pagination state
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([{ id: 'id', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'add' | 'edit' | 'adjust' | 'delete'
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formMasterSku, setFormMasterSku] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStock, setFormStock] = useState(0);
  const [formThreshold, setFormThreshold] = useState(10);

  // New SKU mapping form states (inside edit modal)
  const [newMappingSku, setNewMappingSku] = useState('');
  const [newMappingQty, setNewMappingQty] = useState(1);

  // Stock Adjust form states
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('manual_adjust');
  const [adjustRef, setAdjustRef] = useState('');

  // Hover card state
  const [hoverCard, setHoverCard] = useState({
    visible: false,
    x: 0,
    y: 0,
    productId: null,
    name: '',
    model: '',
    movements: [],
    loading: false,
    error: false,
  });

  const hoverTriggerRef = useRef(null);

  // Fetch products
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    }
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast('Error', 'Failed to load products', 'error');
    }
  }, [error]);

  // REST resync invalidations
  useEffect(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    };

    window.addEventListener('resync-data', handleResync);

    return () => {
      window.removeEventListener('resync-data', handleResync);
    };
  }, [queryClient]);

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (newProduct) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create product');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Product created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const editProductMutation = useMutation({
    mutationFn: async ({ id, updatedProduct }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update product');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Updated', 'Product details saved', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete product');
      }
    },
    onSuccess: () => {
      showToast('Deleted', 'Product deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, adjustment }) => {
      const res = await fetch(`/api/products/${id}/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustment),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to adjust stock');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Stock level adjusted', 'success');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  // Fetch SKU mappings
  const { data: skuMappings = [], isLoading: isLoadingSkuMappings } = useQuery({
    queryKey: ['skuMappings'],
    queryFn: async () => {
      const res = await fetch('/api/import/sku-mappings');
      if (!res.ok) throw new Error('Failed to fetch SKU mappings');
      return res.json();
    },
  });

  const addSkuMappingMutation = useMutation({
    mutationFn: async (newMapping) => {
      const res = await fetch('/api/import/sku-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapping),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add SKU reference');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'SKU reference added successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['skuMappings'] });
      setNewMappingSku('');
      setNewMappingQty(1);
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const deleteSkuMappingMutation = useMutation({
    mutationFn: async (mappingToDelete) => {
      const res = await fetch('/api/import/sku-mappings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingToDelete),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete SKU reference');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'SKU reference deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['skuMappings'] });
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  // Modal Openers
  const openAddModal = () => {
    setFormName('');
    setFormMasterSku('');
    setFormModel('');
    setFormDesc('');
    setFormStock(0);
    setFormThreshold(10);
    setActiveModal('add');
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormName(product.name || '');
    setFormMasterSku(product.master_sku || '');
    setFormModel(product.model || '');
    setFormDesc(product.description || '');
    setFormThreshold(product.low_stock_threshold || 0);
    setNewMappingSku('');
    setNewMappingQty(1);
    setActiveModal('edit');
  };

  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustQty('');
    setAdjustType('manual_adjust');
    setAdjustRef('');
    setActiveModal('adjust');
  };

  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setActiveModal('delete');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProduct(null);
  };

  // Submit Handlers
  const handleAddSubmit = (e) => {
    e.preventDefault();
    createProductMutation.mutate({
      name: formName,
      master_sku: formMasterSku,
      model: formModel,
      description: formDesc,
      initial_stock: parseInt(formStock, 10) || 0,
      low_stock_threshold: parseInt(formThreshold, 10) || 0,
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editProductMutation.mutate({
      id: selectedProduct.id,
      updatedProduct: {
        name: formName,
        master_sku: formMasterSku,
        model: formModel,
        description: formDesc,
        low_stock_threshold: parseInt(formThreshold, 10) || 0,
      },
    });
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    const qtyChange = parseInt(adjustQty, 10);
    if (isNaN(qtyChange) || qtyChange === 0) {
      showToast('Warning', 'Quantity change cannot be zero', 'warning');
      return;
    }
    adjustStockMutation.mutate({
      id: selectedProduct.id,
      adjustment: {
        quantity_change: qtyChange,
        movement_type: adjustType,
        reference: adjustRef,
      },
    });
  };

  const handleDeleteSubmit = () => {
    deleteProductMutation.mutate(selectedProduct.id);
  };

  // Fetch ledger for hover card
  useEffect(() => {
    if (!hoverCard.productId) return;

    let active = true;
    setHoverCard((prev) => ({ ...prev, loading: true, error: false }));

    fetch(`/api/products/${hoverCard.productId}/ledger`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load ledger');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        // Sort by created_at ASC to calculate running balance chronologically
        data.sort((a, b) => {
          const da = typeof a.created_at === 'string' && !a.created_at.includes('T') ? a.created_at.replace(/-/g, '/') : a.created_at;
          const db = typeof b.created_at === 'string' && !b.created_at.includes('T') ? b.created_at.replace(/-/g, '/') : b.created_at;
          return new Date(da) - new Date(db);
        });
        setHoverCard((prev) => ({ ...prev, movements: data, loading: false }));
      })
      .catch((err) => {
        if (!active) return;
        setHoverCard((prev) => ({ ...prev, loading: false, error: true }));
      });

    return () => {
      active = false;
    };
  }, [hoverCard.productId]);

  // Click outside listener to dismiss hover card
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (hoverCard.visible) {
        const trigger = e.target.closest('.hover-ledger-trigger');
        const card = document.getElementById('hover-ledger-card');
        if (!trigger && (!card || !card.contains(e.target))) {
          setHoverCard((prev) => ({ ...prev, visible: false, productId: null }));
        }
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [hoverCard.visible]);

  // Handle Hover Triggering
  const triggerHoverCard = (e, product) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const triggerEl = e.currentTarget;

    // We defer positioning measurement to a short timeout or render cycle
    setHoverCard((prev) => {
      const cardWidth = 580;
      const cardHeight = 250;

      let left = rect.left;
      if (left + cardWidth > window.innerWidth) {
        left = window.innerWidth - cardWidth - 10;
      }
      if (left < 10) left = 10;

      let top = rect.bottom + window.scrollY + 8;
      if (rect.bottom + cardHeight > window.innerHeight) {
        top = rect.top + window.scrollY - cardHeight - 8;
        if (top < window.scrollY) {
          top = rect.bottom + window.scrollY + 8;
        }
      }

      return {
        ...prev,
        visible: true,
        x: left,
        y: top,
        productId: product.id,
        name: product.name,
        model: product.model,
      };
    });
  };

  const handleCellClick = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoverCard.visible && hoverCard.productId === product.id) {
      setHoverCard((prev) => ({ ...prev, visible: false, productId: null }));
    } else {
      triggerHoverCard(e, product);
    }
  };

  // Define Table Columns
  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <span
            className="hover-ledger-trigger"
            style={{
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline dotted var(--text-muted)',
              textUnderlineOffset: '4px',
            }}
            onClick={(e) => handleCellClick(e, product)}
          >
            {product.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'master_sku',
      header: 'Master SKU',
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <span
            className="status-tag info"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}
          >
            {val || '-'}
          </span>
        );
      },
    },
    {
      accessorKey: 'model',
      header: 'SKU',
      cell: ({ getValue }) => <span className="status-tag info">{getValue()}</span>,
    },
    {
      accessorKey: 'current_stock',
      header: 'Stock',
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>{getValue()}</span>
      ),
    },
    {
      accessorKey: 'low_stock_threshold',
      header: 'Threshold',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      accessorFn: (row) => {
        if (row.current_stock <= 0) return 'Out of Stock';
        if (row.current_stock <= row.low_stock_threshold) return 'Low Stock';
        return 'Good';
      },
      cell: ({ getValue }) => {
        const status = getValue();
        let statusClass = 'success';
        if (status === 'Out of Stock') statusClass = 'danger';
        if (status === 'Low Stock') statusClass = 'warning';
        return <span className={`status-tag ${statusClass}`}>{status}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="actions-cell">
            <button
              className="btn btn-secondary btn-sm btn-adjust"
              onClick={() => openAdjustModal(product)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
              </svg>
              Adjust
            </button>
            <button
              className="btn btn-secondary btn-sm btn-edit"
              onClick={() => openEditModal(product)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
            <button
              className="btn btn-danger btn-sm btn-delete"
              onClick={() => openDeleteModal(product)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
              </svg>
              Delete
            </button>
          </div>
        );
      },
    },
  ], [hoverCard.visible, hoverCard.productId]);

  // Init TanStack Table
  const table = useReactTable({
    data: products,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-card">
      <div className="section-header">
        <h2>Product List</h2>
        <button id="btn-add-product" className="btn btn-primary" onClick={openAddModal}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 12h14M12 5v14" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Search Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div className="search-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            id="search-products"
            name="search-products"
            placeholder="Search name or SKU..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table Area */}
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
                      className={isSortable ? 'sortable-header' : ''}
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
          <tbody id="products-table-body">
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading products...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No products registered. Click "Add Product" to create one.
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
      {products.length > 0 && (
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

      {/* Hover Ledger Card */}
      {hoverCard.visible && (
        <div
          id="hover-ledger-card"
          className="hover-ledger-card visible"
          style={{
            position: 'absolute',
            left: `${hoverCard.x}px`,
            top: `${hoverCard.y}px`,
            zIndex: 1000,
          }}
        >
          <div className="hover-card-header">
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              {hoverCard.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {hoverCard.model}
            </div>
          </div>
          {hoverCard.loading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <span className="loading-spinner"></span> Loading stock history...
            </div>
          ) : hoverCard.error ? (
            <div style={{ padding: '1.5rem', color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center', fontWeight: 500 }}>
              ⚠️ Failed to load stock history
            </div>
          ) : hoverCard.movements.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
              No stock history recorded.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hover-ledger-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Tanggal</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>No. SJ</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Keterangan</th>
                    <th colSpan={2} style={{ textAlign: 'center' }}>Mutasi Barang</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Stok Akhir</th>
                  </tr>
                  <tr>
                    <th style={{ color: 'var(--success)', textAlign: 'center' }}>Masuk</th>
                    <th style={{ color: 'var(--danger)', textAlign: 'center' }}>Keluar</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let balance = 0;
                    return hoverCard.movements.map((m, idx) => {
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
                        if (m.reference && m.reference.includes('Opname')) {
                          keterangan = 'STOCK OPNAME';
                        } else if (m.quantity_change > 0) {
                          keterangan = 'BARANG MASUK';
                        } else {
                          keterangan = 'MANUAL ADJUST';
                        }
                      } else if (m.movement_type === 'sale') {
                        keterangan = m.platform_name ? m.platform_name.toUpperCase() : 'SHOPEE';
                      } else if (m.movement_type === 'return') {
                        keterangan = 'DIRETUR';
                      } else if (m.movement_type === 'write_off') {
                        keterangan = 'WRITE OFF';
                      }

                      const masuk = qty > 0 ? qty : '';
                      const keluar = qty < 0 ? Math.abs(qty) : '';

                      return (
                        <tr key={m.id || idx}>
                          <td style={{ textAlign: 'center' }}>{dateStr}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{noSj}</td>
                          <td>
                            <span className="status-tag info" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', display: 'inline-block' }}>
                              {keterangan}
                            </span>
                          </td>
                          <td style={{ color: 'var(--success)', fontWeight: 600, textAlign: 'center' }}>{masuk}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600, textAlign: 'center' }}>{keluar}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>{balance}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {activeModal === 'add' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Product</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="modal-product-form" className="login-form" style={{ gap: '1rem' }} onSubmit={handleAddSubmit}>
                <div className="form-group">
                  <label htmlFor="p-name">Product Name (Unique)</label>
                  <input
                    type="text"
                    id="p-name"
                    required
                    placeholder="e.g. Korek Api Model A"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-master-sku">Master SKU (Optional)</label>
                  <input
                    type="text"
                    id="p-master-sku"
                    placeholder="e.g. CROSUP_1S"
                    value={formMasterSku}
                    onChange={(e) => setFormMasterSku(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-model">SKU (Reference)</label>
                  <input
                    type="text"
                    id="p-model"
                    placeholder="e.g. CROBAR_1S"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-desc">Description (Optional)</label>
                  <textarea
                    id="p-desc"
                    placeholder="Details about branding, packaging..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-stock">Initial Stock Level</label>
                  <input
                    type="number"
                    id="p-stock"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-threshold">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    id="p-threshold"
                    min="0"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="modal-product-form" className="btn btn-primary" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {activeModal === 'edit' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Edit Product Details</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '2rem' }}>
              <div>
                <form id="modal-product-edit-form" className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleEditSubmit}>
                  <div className="form-group">
                    <label htmlFor="p-edit-name">Product Name (Unique)</label>
                    <input
                      type="text"
                      id="p-edit-name"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-edit-master-sku">Master SKU</label>
                    <input
                      type="text"
                      id="p-edit-master-sku"
                      placeholder="e.g. CROSUP_1S"
                      value={formMasterSku}
                      onChange={(e) => setFormMasterSku(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-edit-model">SKU (Reference)</label>
                    <input
                      type="text"
                      id="p-edit-model"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-edit-desc">Description</label>
                    <textarea
                      id="p-edit-desc"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-edit-threshold">Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      id="p-edit-threshold"
                      required
                      min="0"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </form>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--accent)' }}>
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  Alternative SKU Mappings
                </h4>
                
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                  Map alternative SKU codes (e.g., from marketplace orders) to this product with an optional quantity multiplier.
                </p>

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-primary)' }}>
                  {isLoadingSkuMappings ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      Loading SKU references...
                    </div>
                  ) : (() => {
                    const productMappings = skuMappings.filter(m => m.product_id === selectedProduct?.id);
                    if (productMappings.length === 0) {
                      return (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          No alternative mappings registered.
                        </div>
                      );
                    }
                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Alternative SKU</th>
                            <th style={{ textAlign: 'center', padding: '0.4rem 0.6rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {productMappings.map((m) => (
                            <tr key={m.sku_code} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace', fontWeight: '500', color: 'var(--text-primary)' }}>
                                {m.sku_code}
                              </td>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', fontWeight: '600' }}>
                                {m.quantity}x
                              </td>
                              <td style={{ padding: '0.3rem 0.6rem', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '0.15rem 0.35rem', fontSize: '0.72rem', minHeight: 'unset', borderRadius: 'var(--border-radius-sm)' }}
                                  onClick={() => {
                                    if (confirm(`Delete alternative mapping for "${m.sku_code}"?`)) {
                                      deleteSkuMappingMutation.mutate({ sku_code: m.sku_code, product_id: selectedProduct.id });
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Add Alternative Mapping
                  </h5>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-secondary)' }}>SKU Code</label>
                      <input
                        type="text"
                        placeholder="e.g. CROGAS_RED"
                        value={newMappingSku}
                        onChange={(e) => setNewMappingSku(e.target.value.toUpperCase())}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.8rem',
                          borderRadius: 'var(--border-radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                    <div style={{ width: '60px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={newMappingQty}
                        onChange={(e) => setNewMappingQty(parseInt(e.target.value, 10) || 1)}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.35rem',
                          fontSize: '0.8rem',
                          borderRadius: 'var(--border-radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', height: '30px', minHeight: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        if (!newMappingSku.trim()) {
                          showToast('Warning', 'SKU code is required', 'warning');
                          return;
                        }
                        addSkuMappingMutation.mutate({
                          sku_code: newMappingSku.trim(),
                          product_id: selectedProduct.id,
                          quantity: newMappingQty,
                        });
                      }}
                      disabled={addSkuMappingMutation.isPending}
                    >
                      {addSkuMappingMutation.isPending ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="modal-product-edit-form" className="btn btn-primary" disabled={editProductMutation.isPending}>
                {editProductMutation.isPending ? 'Updating...' : 'Update Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {activeModal === 'adjust' && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Adjust Stock: {selectedProduct.name}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Current Stock:</strong>{' '}
                <span style={{ fontWeight: 600 }}>{selectedProduct.current_stock}</span> units
              </div>
              <form id="modal-adjust-form" className="login-form" style={{ gap: '1rem' }} onSubmit={handleAdjustSubmit}>
                <div className="form-group">
                  <label htmlFor="p-adjust-qty">Quantity Change</label>
                  <input
                    type="number"
                    id="p-adjust-qty"
                    required
                    placeholder="Use negative numbers to subtract (e.g. -5)"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="p-adjust-type">Movement Type</label>
                  <select
                    id="p-adjust-type"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                  >
                    <option value="manual_adjust">Manual Adjustment</option>
                    <option value="return">Return</option>
                    <option value="write_off">Write Off (Loss/Damaged)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="p-adjust-ref">Reference/Reason</label>
                  <input
                    type="text"
                    id="p-adjust-ref"
                    required
                    placeholder="e.g. Stock count recount, damaged box, return from J&T"
                    value={adjustRef}
                    onChange={(e) => setAdjustRef(e.target.value)}
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="modal-adjust-form" className="btn btn-primary" disabled={adjustStockMutation.isPending}>
                {adjustStockMutation.isPending ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {activeModal === 'delete' && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete Product</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Are you sure you want to delete product <strong>{selectedProduct.name}</strong>?
              </p>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                ⚠️ This action is permanent and will delete all associated order item histories and stock movements!
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteSubmit} disabled={deleteProductMutation.isPending}>
                {deleteProductMutation.isPending ? 'Deleting...' : '🗑️ Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
