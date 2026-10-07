import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { api } from '../utils/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSocket } from '../utils/socket';
import { playOrderNotificationSound } from '../utils/sound';

export const KDSPage: React.FC = () => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const fetchKDSOrders = async () => {
    try {
      setLoading(true);
      const data = await api.get<Order[]>('/kds/orders');
      setOrders(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch kitchen orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKDSOrders();

    const socket = getSocket();

    const handleNewOrder = (newOrder: Order) => {
      setOrders((prev) => [...prev, newOrder]);
      if (soundEnabled) {
        playOrderNotificationSound();
      }
      showToast(`NEW TICKET #${newOrder.orderNumber} (Table ${newOrder.table.tableNumber})`, 'info');
    };

    const handleStatusUpdate = (payload: { orderId: string; status: OrderStatus }) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === payload.orderId ? { ...o, status: payload.status } : o))
          .filter((o) => ['NEW', 'PREPARING', 'READY'].includes(o.status))
      );
    };

    socket.on('kitchen:new_order', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdate);

    return () => {
      socket.off('kitchen:new_order', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdate);
    };
  }, [soundEnabled]);

  const handleStartPreparing = async (orderId: string) => {
    try {
      const updated = await api.patch<Order>(`/kds/orders/${orderId}/prepare`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`Order #${updated.orderNumber} is now PREPARING`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating order status', 'error');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      const updated = await api.patch<Order>(`/kds/orders/${orderId}/ready`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`Order #${updated.orderNumber} marked READY for pickup!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating order status', 'error');
    }
  };

  const newOrders = orders.filter((o) => o.status === 'NEW');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  const getTimeElapsed = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    return `${mins}m ago`;
  };

  return (
    <div style={{ backgroundColor: '#090d16', minHeight: '100vh', color: '#f8fafc', padding: '1.25rem' }}>
      {/* KDS Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: '#0284c7',
              borderRadius: '8px',
              display: 'flex',
            }}
          >
            <ChefHat size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.025em' }}>
              Kitchen Display System (KDS)
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {restaurant?.name} • Live Ticket Queue ({orders.length} active tickets)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn btn-secondary btn-sm"
            style={{
              backgroundColor: soundEnabled ? '#1e293b' : '#334155',
              borderColor: '#334155',
              color: 'white',
            }}
          >
            {soundEnabled ? <Volume2 size={16} color="#38bdf8" /> : <VolumeX size={16} color="#94a3b8" />}
            <span>{soundEnabled ? 'Chime Active' : 'Chime Off'}</span>
          </button>
          <button
            onClick={fetchKDSOrders}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: 'white' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          Loading active kitchen tickets...
        </div>
      ) : (
        /* KDS Three Column Board */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          {/* Column 1: New Orders */}
          <KDSColumn
            title="NEW TICKETS"
            count={newOrders.length}
            headerColor="#1d4ed8"
            borderColor="#3b82f6"
          >
            {newOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                No new tickets in queue
              </div>
            ) : (
              newOrders.map((order) => (
                <KDSTicketCard
                  key={order.id}
                  order={order}
                  elapsedTime={getTimeElapsed(order.createdAt)}
                  actionButton={
                    <button
                      onClick={() => handleStartPreparing(order.id)}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        backgroundColor: '#1d4ed8',
                        borderColor: '#2563eb',
                        fontWeight: 600,
                        padding: '0.625rem',
                      }}
                    >
                      <ArrowRight size={16} /> START PREPARING
                    </button>
                  }
                />
              ))
            )}
          </KDSColumn>

          {/* Column 2: In Preparation */}
          <KDSColumn
            title="PREPARING"
            count={preparingOrders.length}
            headerColor="#b45309"
            borderColor="#f59e0b"
          >
            {preparingOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                No tickets currently in prep
              </div>
            ) : (
              preparingOrders.map((order) => (
                <KDSTicketCard
                  key={order.id}
                  order={order}
                  elapsedTime={getTimeElapsed(order.createdAt)}
                  actionButton={
                    <button
                      onClick={() => handleMarkReady(order.id)}
                      className="btn btn-success"
                      style={{
                        width: '100%',
                        backgroundColor: '#047857',
                        borderColor: '#059669',
                        color: 'white',
                        fontWeight: 600,
                        padding: '0.625rem',
                      }}
                    >
                      <CheckCircle2 size={16} /> MARK READY
                    </button>
                  }
                />
              ))
            )}
          </KDSColumn>

          {/* Column 3: Ready for Pickup */}
          <KDSColumn
            title="READY FOR PICKUP"
            count={readyOrders.length}
            headerColor="#047857"
            borderColor="#10b981"
          >
            {readyOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                No completed dishes awaiting service
              </div>
            ) : (
              readyOrders.map((order) => (
                <KDSTicketCard
                  key={order.id}
                  order={order}
                  elapsedTime={getTimeElapsed(order.createdAt)}
                  statusBadge="Awaiting Waiter Pickup"
                />
              ))
            )}
          </KDSColumn>
        </div>
      )}
    </div>
  );
};

const KDSColumn: React.FC<{
  title: string;
  count: number;
  headerColor: string;
  borderColor: string;
  children: React.ReactNode;
}> = ({ title, count, headerColor, borderColor, children }) => (
  <div
    style={{
      backgroundColor: '#111827',
      borderRadius: '8px',
      border: `1px solid #1f2937`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: headerColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 700,
        fontSize: '0.875rem',
        letterSpacing: '0.05em',
      }}
    >
      <span>{title}</span>
      <span
        style={{
          backgroundColor: 'rgba(255,255,255,0.2)',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '0.75rem',
        }}
      >
        {count}
      </span>
    </div>
    <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {children}
    </div>
  </div>
);

const KDSTicketCard: React.FC<{
  order: Order;
  elapsedTime: string;
  actionButton?: React.ReactNode;
  statusBadge?: string;
}> = ({ order, elapsedTime, actionButton, statusBadge }) => (
  <div
    style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '6px',
      padding: '0.875rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}
  >
    {/* Card Header */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #334155',
        paddingBottom: '0.5rem',
      }}
    >
      <div>
        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#f8fafc' }}>
          Ticket #{order.orderNumber}
        </div>
        <div
          style={{
            display: 'inline-block',
            backgroundColor: '#0284c7',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.8125rem',
            padding: '2px 8px',
            borderRadius: '4px',
            marginTop: '2px',
          }}
        >
          {order.table?.tableNumber || 'Takeaway'}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#94a3b8',
          fontSize: '0.75rem',
          backgroundColor: '#0f172a',
          padding: '3px 8px',
          borderRadius: '4px',
        }}
      >
        <Clock size={12} />
        <span>{elapsedTime}</span>
      </div>
    </div>

    {/* Special Instructions Alert */}
    {order.specialInstructions && (
      <div
        style={{
          backgroundColor: '#451a03',
          border: '1px solid #78350f',
          color: '#fef3c7',
          padding: '0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
        <span>
          <strong>Order Note:</strong> {order.specialInstructions}
        </span>
      </div>
    )}

    {/* Order Items List */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {order.orderItems?.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '0.25rem 0',
            borderBottom: '1px dashed #334155',
          }}
        >
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff' }}>
              <span
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  marginRight: '6px',
                }}
              >
                {item.quantity}x
              </span>
              {item.name}
            </div>
            {item.specialInstructions && (
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '2rem' }}>
                ↳ {item.specialInstructions}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Status Footer or Action Button */}
    {actionButton && <div style={{ marginTop: '0.25rem' }}>{actionButton}</div>}
    {statusBadge && (
      <div
        style={{
          textAlign: 'center',
          backgroundColor: '#064e3b',
          color: '#a7f3d0',
          padding: '0.4rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {statusBadge}
      </div>
    )}
  </div>
);
