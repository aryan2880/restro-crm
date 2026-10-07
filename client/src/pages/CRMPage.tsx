import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, Mail, Calendar, ShoppingBag, Eye, DollarSign } from 'lucide-react';
import { api } from '../utils/api';
import { CustomerProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const CRMPage: React.FC = () => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.get<CustomerProfile[]>(`/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setCustomers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to retrieve CRM customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const openCustomerDetail = async (id: string) => {
    try {
      setSelectedCustomerId(id);
      const detail = await api.get<any>(`/customers/${id}`);
      setCustomerDetail(detail);
    } catch (err: any) {
      showToast('Failed to load customer profile details.', 'error');
    }
  };

  const currency = restaurant?.currency || '₹';

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Customer CRM & Guest Profiles</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Real customer spending history, dining frequency, and favorite dishes aggregated from actual orders.
          </p>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading customer profiles...</div>
      ) : customers.length === 0 ? (
        <div className="empty-state card">
          <Users size={40} className="empty-state-icon" />
          <h3>No customer profiles recorded yet</h3>
          <p>Customer profiles are captured automatically when guests enter their contact details during QR checkout.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Avg Spend</th>
                <th>Favorite Dishes</th>
                <th>Last Dining</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>{c.phone}</td>
                  <td>
                    <span style={{ fontWeight: 600, backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                      {c.totalOrders}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#0284c7' }}>{currency}{c.totalSpent.toFixed(2)}</td>
                  <td>{currency}{c.averageSpend.toFixed(2)}</td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.favoriteItems.length > 0 ? c.favoriteItems.join(', ') : 'None yet'}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    <button onClick={() => openCustomerDetail(c.id)} className="btn btn-secondary btn-sm">
                      <Eye size={14} /> Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Detail & Order History Modal */}
      {selectedCustomerId && customerDetail && (
        <div className="modal-overlay" onClick={() => setSelectedCustomerId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{customerDetail.name}</h3>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Phone: {customerDetail.phone}</span>
              </div>
              <span className="badge badge-ready">{customerDetail.totalOrders} Total Orders</span>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lifetime Spend</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0284c7' }}>
                  {currency}{customerDetail.totalSpent.toFixed(2)}
                </div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Average Ticket</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {currency}{customerDetail.averageSpend.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Order History */}
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>Past Order History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
              {customerDetail.orders?.map((o: any) => (
                <div
                  key={o.id}
                  style={{
                    padding: '0.625rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>Order #{o.orderNumber} (Table {o.table?.tableNumber})</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {new Date(o.createdAt).toLocaleString()} • {o.orderItems?.length} items
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{currency}{o.total.toFixed(2)}</div>
                    <span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setSelectedCustomerId(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
