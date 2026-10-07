import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Receipt,
  FileDown,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../utils/api';
import { Order, DashboardMetrics, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSocket } from '../utils/socket';
import { playOrderNotificationSound } from '../utils/sound';

interface DashboardPageProps {
  onOpenBill: (orderId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenBill }) => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsData, ordersData] = await Promise.all([
        api.get<{ metrics: DashboardMetrics; bestSellingItems: any[] }>('/analytics/dashboard'),
        api.get<Order[]>('/orders'),
      ]);

      setMetrics(analyticsData.metrics);
      setBestSellers(analyticsData.bestSellingItems);
      setOrders(ordersData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket();

    const handleNewOrder = (newOrder: Order) => {
      setOrders((prev) => [newOrder, ...prev]);
      playOrderNotificationSound();
      showToast(`New order #${newOrder.orderNumber} received from Table ${newOrder.table.tableNumber}!`, 'info');
      // Refresh metrics silently
      api.get<{ metrics: DashboardMetrics; bestSellingItems: any[] }>('/analytics/dashboard')
        .then((data) => {
          setMetrics(data.metrics);
          setBestSellers(data.bestSellingItems);
        })
        .catch(() => {});
    };

    const handleStatusUpdate = (payload: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.status } : o))
      );
      if (selectedOrder && selectedOrder.id === payload.orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: payload.status } : null));
      }
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdate);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdate);
    };
  }, [selectedOrder]);

  const updateOrderStatus = async (orderId: string, targetStatus: OrderStatus) => {
    try {
      const updated = await api.patch<Order>(`/orders/${orderId}/status`, { status: targetStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
      showToast(`Order #${updated.orderNumber} updated to ${targetStatus}`, 'success');
      // Refresh metrics
      api.get<{ metrics: DashboardMetrics; bestSellingItems: any[] }>('/analytics/dashboard')
        .then((data) => {
          setMetrics(data.metrics);
        })
        .catch(() => {});
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status.', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchNum = String(o.orderNumber).includes(s);
      const matchTable = o.table.tableNumber.toLowerCase().includes(s);
      const matchCustomer = o.customer?.name?.toLowerCase().includes(s) || o.customer?.phone?.includes(s);
      if (!matchNum && !matchTable && !matchCustomer) return false;
    }
    return true;
  });

  const currency = restaurant?.currency || '₹';

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Row */}
      {metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <MetricCard
            title="Today's Revenue"
            value={`${currency}${metrics.todayRevenue.toLocaleString()}`}
            subtitle="Paid orders today"
            icon={<TrendingUp size={20} color="#0284c7" />}
          />
          <MetricCard
            title="Today's Orders"
            value={metrics.todayOrdersCount.toString()}
            subtitle={`${metrics.pendingOrdersCount} pending`}
            icon={<ShoppingBag size={20} color="#0f172a" />}
          />
          <MetricCard
            title="Average Order Value"
            value={`${currency}${metrics.averageOrderValue.toFixed(0)}`}
            subtitle="Based on paid orders"
            icon={<Receipt size={20} color="#059669" />}
          />
          <MetricCard
            title="Active Tables"
            value={`${metrics.activeTables} / ${metrics.totalTables}`}
            subtitle="Currently occupied"
            icon={<Clock size={20} color="#d97706" />}
          />
        </div>
      )}

      {/* Main Content: Orders + Best Sellers */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
        {/* Left Side: Live Orders Table */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>Live Kitchen & Floor Orders</h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Real-time synchronized order stream. Updates automatically without manual refresh.
              </p>
            </div>
            <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search order #, table, customer phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {['ALL', 'NEW', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading real orders from database...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={36} className="empty-state-icon" />
              <h3>No orders yet</h3>
              <p>When customers scan table QR codes and submit orders, they will appear here instantly.</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Time</th>
                    <th>Table</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>#{order.orderNumber}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {order.table?.tableNumber || '-'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{order.customer?.name || 'Guest'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.customer?.phone || ''}</div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8125rem' }}>
                          {order.orderItems?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{currency}{order.total.toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="btn btn-secondary btn-sm"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => onOpenBill(order.id)}
                            className="btn btn-secondary btn-sm"
                            title="Bill / POS"
                          >
                            <Receipt size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Best Selling Menu Items */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Best-Selling Items</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Real customer order performance</p>
          </div>

          {bestSellers.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
              No sales data recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {bestSellers.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.625rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{item.quantity} orders</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0284c7' }}>
                    {currency}{item.revenue.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Order #{selectedOrder.orderNumber}</h3>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Table {selectedOrder.table?.tableNumber} • {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <span className={`badge badge-${selectedOrder.status.toLowerCase()}`}>{selectedOrder.status}</span>
            </div>

            {/* Customer Details */}
            <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <div><strong>Customer:</strong> {selectedOrder.customer?.name || 'Dine-in Guest'}</div>
              <div><strong>Phone:</strong> {selectedOrder.customer?.phone || 'Not provided'}</div>
              {selectedOrder.specialInstructions && (
                <div style={{ marginTop: '0.375rem', color: '#b45309' }}>
                  <strong>Special Instructions:</strong> {selectedOrder.specialInstructions}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Ordered Items</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {selectedOrder.orderItems?.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.375rem 0',
                      borderBottom: '1px dashed #e2e8f0',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{it.quantity}x</span> {it.name}
                      {it.specialInstructions && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309' }}>
                          Note: {it.specialInstructions}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600 }}>{currency}{it.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Subtotal:</span>
                  <span>{currency}{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Tax/GST:</span>
                  <span>{currency}{selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a', marginTop: '0.25rem' }}>
                  <span>Grand Total:</span>
                  <span>{currency}{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Status Change Buttons */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Update Order Status:</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedOrder.status === 'NEW' && (
                  <button onClick={() => updateOrderStatus(selectedOrder.id, 'PREPARING')} className="btn btn-primary btn-sm">
                    Start Preparing
                  </button>
                )}
                {selectedOrder.status === 'PREPARING' && (
                  <button onClick={() => updateOrderStatus(selectedOrder.id, 'READY')} className="btn btn-success btn-sm">
                    Mark Ready for Pickup
                  </button>
                )}
                {selectedOrder.status === 'READY' && (
                  <button onClick={() => updateOrderStatus(selectedOrder.id, 'SERVED')} className="btn btn-primary btn-sm">
                    Mark Served to Table
                  </button>
                )}
                {selectedOrder.status === 'SERVED' && (
                  <button onClick={() => updateOrderStatus(selectedOrder.id, 'COMPLETED')} className="btn btn-success btn-sm">
                    Complete & Settle
                  </button>
                )}
                {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                  <button onClick={() => updateOrderStatus(selectedOrder.id, 'CANCELLED')} className="btn btn-danger btn-sm">
                    Cancel Order
                  </button>
                )}
                <button
                  onClick={() => {
                    const id = selectedOrder.id;
                    setSelectedOrder(null);
                    onOpenBill(id);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Receipt size={14} /> Open Bill / Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}> = ({ title, value, subtitle, icon }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748b' }}>{title}</span>
      <div style={{ padding: '0.375rem', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</div>
  </div>
);
