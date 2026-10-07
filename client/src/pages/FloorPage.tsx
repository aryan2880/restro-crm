import React, { useState, useEffect } from 'react';
import { ConciergeBell, CheckCircle2, Clock, Users, Receipt, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { Table, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSocket } from '../utils/socket';
import { playOrderNotificationSound } from '../utils/sound';

interface FloorPageProps {
  onOpenBill: (orderId: string) => void;
}

export const FloorPage: React.FC<FloorPageProps> = ({ onOpenBill }) => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [tables, setTables] = useState<Table[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFloorData = async () => {
    try {
      setLoading(true);
      const [tablesData, ordersData] = await Promise.all([
        api.get<Table[]>('/tables'),
        api.get<Order[]>('/orders?status=READY'),
      ]);
      setTables(tablesData);
      setReadyOrders(ordersData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load floor data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorData();

    const socket = getSocket();

    const handleStatusUpdate = () => {
      fetchFloorData();
    };

    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('order:new', handleStatusUpdate);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('order:new', handleStatusUpdate);
    };
  }, []);

  const handleMarkServed = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'SERVED' });
      showToast('Order marked as SERVED to guest table.', 'success');
      fetchFloorData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update order status.', 'error');
    }
  };

  const currency = restaurant?.currency || '₹';

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Service Floor & Waiter Dispatch</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Live table monitoring, ready dish pickups, and table service status.
          </p>
        </div>
        <button onClick={fetchFloorData} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Urgent Section: Ready for Pickup Dishes */}
      {readyOrders.length > 0 && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46', fontWeight: 700 }}>
            <ConciergeBell size={20} />
            <span>Ready for Service! Kitchen marked dishes ready for {readyOrders.length} table(s):</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {readyOrders.map((ro) => (
              <div
                key={ro.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  padding: '0.875rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                    Table {ro.table?.tableNumber}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ticket #{ro.orderNumber}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                  {ro.orderItems?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
                <button
                  onClick={() => handleMarkServed(ro.id)}
                  className="btn btn-success btn-sm"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                >
                  <CheckCircle2 size={14} /> Mark Served to Table
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dining Tables Floor Plan Grid */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>All Dining Tables</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading dining tables...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {tables.map((table) => {
              const isOccupied = table.isOccupied;
              return (
                <div
                  key={table.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    borderTop: isOccupied ? '4px solid #0284c7' : '4px solid #10b981',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{table.tableNumber}</h4>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: isOccupied ? '#eff6ff' : '#ecfdf5',
                        color: isOccupied ? '#1d4ed8' : '#047857',
                      }}
                    >
                      {isOccupied ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Capacity: {table.capacity} guests
                  </div>

                  {table.currentOrder ? (
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      <div>Order #{table.currentOrder.orderNumber}</div>
                      <div>Status: <strong style={{ color: '#0284c7' }}>{table.currentOrder.status}</strong></div>
                      <div>Total: {currency}{table.currentOrder.total.toFixed(2)}</div>
                      <button
                        onClick={() => onOpenBill(table.currentOrder!.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                      >
                        <Receipt size={14} /> Settle / Bill
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      Ready for seating
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
