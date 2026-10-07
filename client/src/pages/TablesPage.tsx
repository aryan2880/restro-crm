import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Plus,
  Trash2,
  Edit,
  Download,
  Printer,
  ExternalLink,
  Users,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../utils/api';
import { Table } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const TablesPage: React.FC = () => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Form State
  const [tableNumber, setTableNumber] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(4);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const fetchTables = async () => {
    try {
      setLoading(true);
      const data = await api.get<Table[]>('/tables');
      setTables(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch restaurant tables.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) return;

    try {
      const created = await api.post<Table>('/tables', {
        tableNumber: tableNumber.trim(),
        capacity: Number(capacity),
      });
      setTables((prev) => [...prev, created].sort((a, b) => a.tableNumber.localeCompare(b.tableNumber)));
      setShowAddModal(false);
      setTableNumber('');
      setCapacity(4);
      showToast(`Table ${created.tableNumber} created successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create table.', 'error');
    }
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !tableNumber) return;

    try {
      const updated = await api.put<Table>(`/tables/${selectedTable.id}`, {
        tableNumber: tableNumber.trim(),
        capacity: Number(capacity),
      });
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShowEditModal(false);
      setSelectedTable(null);
      showToast('Table updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update table.', 'error');
    }
  };

  const handleDeleteTable = async (table: Table) => {
    if (!confirm(`Are you sure you want to delete ${table.tableNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/tables/${table.id}`);
      setTables((prev) => prev.filter((t) => t.id !== table.id));
      showToast(`Table ${table.tableNumber} deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete table.', 'error');
    }
  };

  const openQrModal = async (table: Table) => {
    setSelectedTable(table);
    try {
      const origin = window.location.origin;
      const menuUrl = `${origin}/menu/${restaurant?.slug}?table=${encodeURIComponent(table.tableNumber)}`;
      const url = await QRCode.toDataURL(menuUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
      setShowQrModal(true);
    } catch (err) {
      showToast('Failed to generate QR code.', 'error');
    }
  };

  const downloadQrPng = () => {
    if (!qrDataUrl || !selectedTable) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${restaurant?.slug}-${selectedTable.tableNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const printQrCard = () => {
    window.print();
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Table Management & QR Studio</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Manage dining tables, track real-time occupancy, and generate table-specific QR codes.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus size={16} /> Add Table
        </button>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading tables from database...</div>
      ) : tables.length === 0 ? (
        <div className="empty-state card">
          <QrCode size={40} className="empty-state-icon" />
          <h3>No dining tables added yet</h3>
          <p>Create your first table (e.g. Table 01 or T-01) to automatically generate printable QR codes.</p>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Add First Table
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {tables.map((table) => {
            const isOccupied = table.isOccupied;
            return (
              <div
                key={table.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                  borderTop: isOccupied ? '4px solid #0284c7' : '4px solid #10b981',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                      {table.tableNumber}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.75rem' }}>
                      <Users size={12} />
                      <span>Capacity: {table.capacity} guests</span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      backgroundColor: isOccupied ? '#eff6ff' : '#ecfdf5',
                      color: isOccupied ? '#1d4ed8' : '#047857',
                      border: `1px solid ${isOccupied ? '#bfdbfe' : '#a7f3d0'}`,
                    }}
                  >
                    {isOccupied ? 'Occupied' : 'Vacant'}
                  </span>
                </div>

                {/* Occupancy Info */}
                {table.currentOrder && (
                  <div
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      Active Ticket #{table.currentOrder.orderNumber}
                    </div>
                    <div style={{ color: '#64748b' }}>
                      Status: <strong style={{ color: '#0284c7' }}>{table.currentOrder.status}</strong> • Total: {restaurant?.currency}{table.currentOrder.total.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => openQrModal(table)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    title="View & Download QR Code"
                  >
                    <QrCode size={14} /> View QR
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTable(table);
                      setTableNumber(table.tableNumber);
                      setCapacity(table.capacity);
                      setShowEditModal(true);
                    }}
                    className="btn btn-secondary btn-sm"
                    title="Edit Table"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table)}
                    className="btn btn-danger btn-sm"
                    title="Delete Table"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Add New Dining Table</h3>
            <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Table Number / Identifier *</label>
                <input
                  type="text"
                  placeholder="e.g. Table 01, T-05, Terrace-3"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Seating Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showEditModal && selectedTable && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Edit Table {selectedTable.tableNumber}</h3>
            <form onSubmit={handleUpdateTable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Table Number *</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Seating Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal & Printable Standee */}
      {showQrModal && selectedTable && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                QR Code for {selectedTable.tableNumber}
              </h3>
              <span className="badge badge-ready">Active</span>
            </div>

            {/* Printable Standee Card */}
            <div
              id="printable-receipt"
              style={{
                border: '2px solid #0f172a',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                marginBottom: '1rem',
              }}
            >
              {restaurant?.logo && (
                <img
                  src={restaurant.logo}
                  alt={restaurant.name}
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', margin: '0 auto 0.5rem' }}
                />
              )}
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{restaurant?.name}</h2>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1rem',
                  padding: '4px 14px',
                  borderRadius: '6px',
                  margin: '0.5rem 0',
                }}
              >
                TABLE: {selectedTable.tableNumber}
              </div>

              {/* QR Image */}
              <div style={{ margin: '0.75rem auto', maxWidth: '240px' }}>
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${selectedTable.tableNumber}`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                )}
              </div>

              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                Scan with phone camera to view menu & order
              </p>
              <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                No app installation required
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={downloadQrPng} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                <Download size={14} /> Download PNG
              </button>
              <button onClick={printQrCard} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                <Printer size={14} /> Print QR Standee
              </button>
              <a
                href={`/menu/${restaurant?.slug}?table=${encodeURIComponent(selectedTable.tableNumber)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <ExternalLink size={14} /> Test URL
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
