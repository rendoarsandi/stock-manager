import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';

export default function Settings() {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'template' | 'user' | 'sku'
  const [modalTarget, setModalTarget] = useState(null);

  // Template Form States
  const [templateName, setTemplateName] = useState('');
  const [colOrderId, setColOrderId] = useState('');
  const [colResiNumber, setColResiNumber] = useState('');
  const [colProductName, setColProductName] = useState('');
  const [colQuantity, setColQuantity] = useState('');
  const [colOrderStatus, setColOrderStatus] = useState('');
  const [colCustomerName, setColCustomerName] = useState('');
  const [colExpedition, setColExpedition] = useState('');
  const [colOrderDate, setColOrderDate] = useState('');
  const [colPrice, setColPrice] = useState('');
  const [colSkuRef, setColSkuRef] = useState('');

  // User Form States
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('staff');

  // SKU Mapping Form States
  const [skuCode, setSkuCode] = useState('');
  const [skuProductId, setSkuProductId] = useState('');
  const [skuQuantity, setSkuQuantity] = useState(1);

  // Queries
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['settingsTemplates'],
    queryFn: async () => {
      const res = await fetch('/api/import/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  const { data: skuMappings = [], isLoading: isLoadingSkuMappings } = useQuery({
    queryKey: ['settingsSkuMappings'],
    queryFn: async () => {
      const res = await fetch('/api/import/sku-mappings');
      if (!res.ok) throw new Error('Failed to fetch SKU mappings');
      return res.json();
    },
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['settingsUsers'],
    queryFn: async () => {
      const res = await fetch('/api/auth/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['settingsProducts'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  // Template mutations
  const saveTemplateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/import/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save template');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Template saved successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['settingsTemplates'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/import/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete template');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'Template deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['settingsTemplates'] });
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create user account');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'User account created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['settingsUsers'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete user account');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'User account deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['settingsUsers'] });
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  // SKU Mapping mutations
  const saveSkuMappingMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/import/sku-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save SKU mapping');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'SKU mapping saved successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['settingsSkuMappings'] });
      closeModal();
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  const deleteSkuMappingMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/import/sku-mappings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete SKU mapping');
      }
      return res.json();
    },
    onSuccess: () => {
      showToast('Success', 'SKU mapping deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['settingsSkuMappings'] });
    },
    onError: (err) => {
      showToast('Error', err.message, 'error');
    },
  });

  // Modal Openers
  const openTemplateModal = (template = null) => {
    if (!isAdmin) {
      showToast('Error', 'Only admins can modify templates', 'error');
      return;
    }
    setModalTarget(template);
    if (template) {
      setTemplateName(template.name || '');
      const mapping = template.column_mapping || {};
      setColOrderId(mapping.order_id || '');
      setColResiNumber(mapping.resi_number || '');
      setColProductName(mapping.product_name_raw || '');
      setColQuantity(mapping.quantity || '');
      setColOrderStatus(mapping.order_status || '');
      setColCustomerName(mapping.customer_name || '');
      setColExpedition(mapping.expedition || '');
      setColOrderDate(mapping.order_date || '');
      setColPrice(mapping.price || '');
      setColSkuRef(mapping.sku_ref || '');
    } else {
      setTemplateName('');
      setColOrderId('');
      setColResiNumber('');
      setColProductName('');
      setColQuantity('');
      setColOrderStatus('');
      setColCustomerName('');
      setColExpedition('');
      setColOrderDate('');
      setColPrice('');
      setColSkuRef('');
    }
    setActiveModal('template');
  };

  const openUserModal = () => {
    setUserUsername('');
    setUserPassword('');
    setUserRole('staff');
    setActiveModal('user');
  };

  const openSkuModal = () => {
    setSkuCode('');
    setSkuProductId('');
    setSkuQuantity(1);
    setActiveModal('sku');
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalTarget(null);
  };

  // Submit Handlers
  const handleTemplateSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: templateName.trim(),
      column_mapping: {
        order_id: colOrderId.trim(),
        resi_number: colResiNumber.trim(),
        product_name_raw: colProductName.trim(),
        quantity: colQuantity.trim(),
        order_status: colOrderStatus.trim(),
        customer_name: colCustomerName.trim(),
        expedition: colExpedition.trim(),
        order_date: colOrderDate.trim(),
        price: colPrice.trim(),
        sku_ref: colSkuRef.trim(),
      },
    };
    if (modalTarget) {
      payload.id = modalTarget.id;
    }
    saveTemplateMutation.mutate(payload);
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    createUserMutation.mutate({
      username: userUsername.trim(),
      password: userPassword,
      role: userRole,
    });
  };

  const handleSkuSubmit = (e) => {
    e.preventDefault();
    saveSkuMappingMutation.mutate({
      sku_code: skuCode.trim(),
      product_id: parseInt(skuProductId, 10),
      quantity: parseInt(skuQuantity, 10),
    });
  };

  // Delete Handlers
  const handleDeleteTemplate = (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to delete user account "${user.username}"?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleDeleteSku = (mapping) => {
    if (window.confirm(`Are you sure you want to delete mapping for "${mapping.sku_code.toUpperCase()}"?`)) {
      deleteSkuMappingMutation.mutate({
        sku_code: mapping.sku_code,
        product_id: mapping.product_id,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Import Templates Section */}
      <div className="section-card">
        <div className="section-header">
          <h2>Import Templates Mapping</h2>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => openTemplateModal()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5v14" />
              </svg>
              Create Template
            </button>
          )}
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Template Name</th>
                <th>Columns Mapped</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody id="templates-table-body">
              {isLoadingTemplates ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading templates...
                  </td>
                </tr>
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No templates found.
                  </td>
                </tr>
              ) : (
                templates.map((t) => {
                  const mappingKeys = Object.entries(t.column_mapping)
                    .map(([k, v]) => `${k} → ${v}`)
                    .join(', ');

                  return (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td><strong>{t.name}</strong></td>
                      <td
                        style={{ fontSize: '0.85rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={JSON.stringify(t.column_mapping)}
                      >
                        {mappingKeys}
                      </td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary btn-sm btn-edit-template" onClick={() => openTemplateModal(t)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm btn-delete-template" onClick={() => handleDeleteTemplate(t.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. User Accounts Management (Admins only) */}
      {isAdmin && (
        <div className="section-card" id="user-management-section">
          <div className="section-header">
            <h2>User Accounts Management</h2>
            <button className="btn btn-primary" onClick={openUserModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5v14" />
              </svg>
              Create Account
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="users-table-body">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const cleanStr = typeof u.created_at === 'string' && !u.created_at.includes('T') ? u.created_at.replace(/-/g, '/') : u.created_at;
                    const createdDate = new Date(cleanStr).toLocaleString();
                    const isSelfOrMainAdmin = u.id === 1 || u.id === currentUser?.id;

                    return (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td><strong>{u.username}</strong></td>
                        <td>
                          <span className={`status-tag ${u.role === 'admin' ? 'info' : 'success'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>{createdDate}</td>
                        <td>
                          {isSelfOrMainAdmin ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Protected</span>
                          ) : (
                            <button className="btn btn-danger btn-sm btn-delete-user" onClick={() => handleDeleteUser(u)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SKU & Bundle Mappings Master */}
      <div className="section-card">
        <div className="section-header">
          <h2>SKU & Bundle Mappings Master</h2>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openSkuModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5v14" />
              </svg>
              Add SKU Mapping
            </button>
          )}
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Target Product</th>
                <th>Model</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="sku-mappings-table-body">
              {isLoadingSkuMappings ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading mappings...
                  </td>
                </tr>
              ) : skuMappings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No custom SKU mappings defined.
                  </td>
                </tr>
              ) : (
                skuMappings.map((m, idx) => (
                  <tr key={m.sku_code + '-' + m.product_id + '-' + idx}>
                    <td><strong>{m.sku_code.toUpperCase()}</strong></td>
                    <td>{m.product_name}</td>
                    <td><code className="code-badge">{m.product_model}</code></td>
                    <td>{m.quantity} Pcs</td>
                    <td>
                      {isAdmin ? (
                        <button className="btn btn-danger btn-sm btn-delete-sku" onClick={() => handleDeleteSku(m)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                          </svg>
                          Delete
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Protected</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Modal */}
      {activeModal === 'template' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>{modalTarget ? 'Edit Import Template' : 'Create Import Template'}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="modal-template-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }} onSubmit={handleTemplateSubmit}>
                <div className="form-group">
                  <label htmlFor="t-name">Template Name</label>
                  <input
                    type="text"
                    id="t-name"
                    required
                    placeholder="e.g. Shopee / Tokopedia"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                <h4 style={{ marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--accent-color)' }}>
                  Column Mapping Configuration
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Enter the exact column names (headers) from your Excel spreadsheet mapping to the system fields.
                </p>

                <div className="form-group">
                  <label htmlFor="m-order-id">Order ID Column (Required)</label>
                  <input
                    type="text"
                    id="m-order-id"
                    required
                    placeholder="e.g. No. Pesanan or Nomor Invoice"
                    value={colOrderId}
                    onChange={(e) => setColOrderId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-resi-number">Resi / Tracking Number Column</label>
                  <input
                    type="text"
                    id="m-resi-number"
                    placeholder="e.g. No. Resi or Nomor Resi"
                    value={colResiNumber}
                    onChange={(e) => setColResiNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-product-name">Product Name / Description Column (Required)</label>
                  <input
                    type="text"
                    id="m-product-name"
                    required
                    placeholder="e.g. Nama Produk"
                    value={colProductName}
                    onChange={(e) => setColProductName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-quantity">Quantity Column (Required)</label>
                  <input
                    type="text"
                    id="m-quantity"
                    required
                    placeholder="e.g. Jumlah or Jumlah Produk"
                    value={colQuantity}
                    onChange={(e) => setColQuantity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-order-status">Order Status Column (Required)</label>
                  <input
                    type="text"
                    id="m-order-status"
                    required
                    placeholder="e.g. Status Pesanan or Status Terakhir"
                    value={colOrderStatus}
                    onChange={(e) => setColOrderStatus(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-customer-name">Customer Username / Name Column</label>
                  <input
                    type="text"
                    id="m-customer-name"
                    placeholder="e.g. Username Pembeli or Nama Pembeli"
                    value={colCustomerName}
                    onChange={(e) => setColCustomerName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-expedition">Expedition / Courier Column</label>
                  <input
                    type="text"
                    id="m-expedition"
                    placeholder="e.g. Opsi Pengiriman or Kurir"
                    value={colExpedition}
                    onChange={(e) => setColExpedition(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-order-date">Order Date / Time Column</label>
                  <input
                    type="text"
                    id="m-order-date"
                    placeholder="e.g. Waktu Pembayaran or Tanggal Transaksi"
                    value={colOrderDate}
                    onChange={(e) => setColOrderDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-price">Price / Payment Column</label>
                  <input
                    type="text"
                    id="m-price"
                    placeholder="e.g. Total Pembayaran or Nilai Transaksi"
                    value={colPrice}
                    onChange={(e) => setColPrice(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="m-sku-ref">SKU Reference Column (Nomor Referensi SKU)</label>
                  <input
                    type="text"
                    id="m-sku-ref"
                    placeholder="e.g. Nomor Referensi SKU or SKU"
                    value={colSkuRef}
                    onChange={(e) => setColSkuRef(e.target.value)}
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="modal-template-form" className="btn btn-primary" disabled={saveTemplateMutation.isPending}>
                {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {activeModal === 'user' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New User Account</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="modal-user-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleUserSubmit}>
                <div className="form-group">
                  <label htmlFor="u-username">Username</label>
                  <input
                    type="text"
                    id="u-username"
                    placeholder="e.g. staff_john"
                    required
                    autoComplete="username"
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="u-password">Password</label>
                  <input
                    type="password"
                    id="u-password"
                    placeholder="Enter password"
                    required
                    autoComplete="new-password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="u-role">Role</label>
                  <select
                    id="u-role"
                    required
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="modal-user-form" className="btn btn-primary" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKU Modal */}
      {activeModal === 'sku' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create SKU / Bundle Mapping</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="modal-sku-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleSkuSubmit}>
                <div className="form-group">
                  <label htmlFor="sku-code">SKU Code (e.g. CROOR_5S or CASE_1B)</label>
                  <input
                    type="text"
                    id="sku-code"
                    placeholder="Enter ecommerce SKU code"
                    required
                    value={skuCode}
                    onChange={(e) => setSkuCode(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sku-product-id">Target Product</label>
                  <select
                    id="sku-product-id"
                    required
                    value={skuProductId}
                    onChange={(e) => setSkuProductId(e.target.value)}
                  >
                    <option value="" disabled>Select target product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="sku-quantity">Quantity Multiplier</label>
                  <input
                    type="number"
                    id="sku-quantity"
                    min="1"
                    required
                    value={skuQuantity}
                    onChange={(e) => setSkuQuantity(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" form="modal-sku-form" className="btn btn-primary" disabled={saveSkuMappingMutation.isPending}>
                {saveSkuMappingMutation.isPending ? 'Saving...' : 'Save Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
