import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Users,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface SuperAdminPageProps {
  activeSubTab?: 'overview' | 'restaurants' | 'users';
}

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ activeSubTab = 'overview' }) => {
  const { showToast } = useToast();

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Restaurant Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newRest, setNewRest] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    plan: 'PRO',
    currency: '₹',
    taxPercentage: 5,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsData, restsData, usersData] = await Promise.all([
        api.get<any>('/superadmin/analytics'),
        api.get<any[]>('/superadmin/restaurants'),
        api.get<any[]>('/superadmin/users'),
      ]);
      setAnalytics(analyticsData);
      setRestaurants(restsData);
      setUsers(usersData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load platform data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/restaurants', newRest);
      showToast(`Restaurant '${newRest.name}' provisioned successfully!`, 'success');
      setShowAddModal(false);
      setNewRest({
        name: '',
        slug: '',
        email: '',
        phone: '',
        address: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        plan: 'PRO',
        currency: '₹',
        taxPercentage: 5,
      });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create restaurant.', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/superadmin/restaurants/${id}/status`, { status: newStatus });
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      showToast(`Restaurant status changed to ${newStatus}.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleDeleteRestaurant = async (r: any) => {
    if (!confirm(`CRITICAL: Are you sure you want to permanently delete '${r.name}' and all associated tenant data?`)) {
      return;
    }
    try {
      await api.delete(`/superadmin/restaurants/${r.id}`);
      setRestaurants((prev) => prev.filter((item) => item.id !== r.id));
      showToast(`Restaurant '${r.name}' deleted cleanly.`, 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete restaurant.', 'error');
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Platform Super Administration</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Multi-tenant SaaS management, tenant lifecycle controls, and aggregated database metrics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Provision Restaurant
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading platform records...</div>
      ) : (
        <>
          {/* Analytics Cards */}
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="card">
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Restaurants</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analytics.totalRestaurants}</div>
                <div style={{ fontSize: '0.6875rem', color: '#16a34a' }}>{analytics.activeRestaurants} active tenants</div>
              </div>
              <div className="card">
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Platform Orders</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analytics.totalOrders}</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Across all restaurants</div>
              </div>
              <div className="card">
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Platform Gross Revenue</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7' }}>
                  ₹{analytics.platformRevenue.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Paid dining tickets</div>
              </div>
              <div className="card">
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Platform Users</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analytics.totalUsers}</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Owners, managers, chefs, waiters</div>
              </div>
            </div>
          )}

          {/* Restaurants Management Table */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Tenants & Restaurant Accounts</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Restaurant</th>
                    <th>Slug</th>
                    <th>Owner</th>
                    <th>Plan</th>
                    <th>Tables</th>
                    <th>Orders</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.phone}</div>
                      </td>
                      <td style={{ color: '#0284c7', fontFamily: 'monospace' }}>/{r.slug}</td>
                      <td>
                        <div>{r.owner?.name || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.owner?.email || '-'}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {r.plan}
                        </span>
                      </td>
                      <td>{r.tableCount}</td>
                      <td>{r.orderCount}</td>
                      <td>
                        <span className={`badge ${r.status === 'ACTIVE' ? 'badge-ready' : 'badge-cancelled'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          {r.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'SUSPENDED')}
                              className="btn btn-secondary btn-sm"
                              title="Suspend Workspace"
                            >
                              <XCircle size={14} color="#dc2626" /> Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'ACTIVE')}
                              className="btn btn-secondary btn-sm"
                              title="Activate Workspace"
                            >
                              <CheckCircle size={14} color="#16a34a" /> Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRestaurant(r)}
                            className="btn btn-danger btn-sm"
                            title="Delete Restaurant"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Restaurant Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Provision New Restaurant Tenant</h3>
            <form onSubmit={handleCreateRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Restaurant Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Bella Italia"
                    value={newRest.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewRest({
                        ...newRest,
                        name,
                        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                      });
                    }}
                    required
                  />
                </div>
                <div>
                  <label>Unique URL Slug *</label>
                  <input
                    type="text"
                    placeholder="bella-italia"
                    value={newRest.slug}
                    onChange={(e) => setNewRest({ ...newRest, slug: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Restaurant Email *</label>
                  <input
                    type="email"
                    placeholder="info@bellaitalia.com"
                    value={newRest.email}
                    onChange={(e) => setNewRest({ ...newRest, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={newRest.phone}
                    onChange={(e) => setNewRest({ ...newRest, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label>Physical Address</label>
                <input
                  type="text"
                  placeholder="Main Street, Downtown"
                  value={newRest.address}
                  onChange={(e) => setNewRest({ ...newRest, address: e.target.value })}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>Owner User Account Credentials</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Owner Name *</label>
                  <input
                    type="text"
                    placeholder="Marco Rossi"
                    value={newRest.ownerName}
                    onChange={(e) => setNewRest({ ...newRest, ownerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label>Owner Login Email *</label>
                  <input
                    type="email"
                    placeholder="marco@bellaitalia.com"
                    value={newRest.ownerEmail}
                    onChange={(e) => setNewRest({ ...newRest, ownerEmail: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label>Owner Password *</label>
                <input
                  type="password"
                  placeholder="Enter initial password"
                  value={newRest.ownerPassword}
                  onChange={(e) => setNewRest({ ...newRest, ownerPassword: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
