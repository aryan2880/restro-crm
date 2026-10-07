import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Printer,
  Download,
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { api } from '../utils/api';
import { Bill, Order, PaymentMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface BillingPageProps {
  initialOrderId?: string | null;
  onClearInitialOrder?: () => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ initialOrderId, onClearInitialOrder }) => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [bills, setBills] = useState<Bill[]>([]);
  const [activeBillData, setActiveBillData] = useState<{ bill: Bill; order: Order } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await api.get<Bill[]>('/billing');
      setBills(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch bills.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificOrderBill = async (orderId: string) => {
    try {
      const data = await api.get<{ bill: Bill; order: Order }>(`/billing/${orderId}`);
      setActiveBillData(data);
      setPaymentMethod(data.bill.paymentMethod || 'CASH');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate bill for order.', 'error');
    }
  };

  useEffect(() => {
    fetchBills();
    if (initialOrderId) {
      loadSpecificOrderBill(initialOrderId);
      if (onClearInitialOrder) onClearInitialOrder();
    }
  }, [initialOrderId]);

  const handleProcessPayment = async () => {
    if (!activeBillData) return;
    try {
      await api.patch(`/billing/${activeBillData.order.id}/pay`, {
        paymentMethod,
      });
      showToast(`Payment of ${restaurant?.currency}${activeBillData.bill.grandTotal.toFixed(2)} recorded!`, 'success');
      loadSpecificOrderBill(activeBillData.order.id);
      fetchBills();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!activeBillData) return;
    const { bill, order } = activeBillData;
    const doc = new jsPDF();
    const currency = restaurant?.currency || 'INR';

    doc.setFontSize(16);
    doc.text(restaurant?.name || 'Restaurant Invoice', 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.text(restaurant?.address || '', 105, 26, { align: 'center' });
    doc.text(`GSTIN: ${restaurant?.gstNumber || 'N/A'} | Phone: ${restaurant?.phone || ''}`, 105, 32, { align: 'center' });

    doc.line(14, 38, 196, 38);

    doc.setFontSize(10);
    doc.text(`Invoice No: ${bill.billNumber}`, 14, 46);
    doc.text(`Order: #${order.orderNumber}`, 14, 52);
    doc.text(`Table: ${order.table?.tableNumber || '-'}`, 14, 58);
    doc.text(`Date: ${new Date(bill.createdAt).toLocaleString()}`, 130, 46);
    doc.text(`Customer: ${order.customer?.name || 'Walk-in Guest'}`, 130, 52);
    doc.text(`Payment: ${bill.paymentStatus} (${bill.paymentMethod})`, 130, 58);

    doc.line(14, 64, 196, 64);

    // Table Header
    doc.setFontSize(9);
    doc.text('Item', 14, 70);
    doc.text('Qty', 110, 70);
    doc.text('Unit Price', 135, 70);
    doc.text('Total', 175, 70);
    doc.line(14, 73, 196, 73);

    let y = 80;
    order.orderItems?.forEach((item) => {
      doc.text(item.name.substring(0, 40), 14, y);
      doc.text(String(item.quantity), 112, y);
      doc.text(`${item.price.toFixed(2)}`, 138, y);
      doc.text(`${item.total.toFixed(2)}`, 175, y);
      y += 7;
    });

    doc.line(14, y + 2, 196, y + 2);
    y += 10;

    doc.text(`Subtotal: ${currency} ${bill.subtotal.toFixed(2)}`, 140, y);
    y += 6;
    doc.text(`Tax/GST (${restaurant?.taxPercentage}%): ${currency} ${bill.tax.toFixed(2)}`, 140, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(`Grand Total: ${currency} ${bill.grandTotal.toFixed(2)}`, 140, y);

    y += 20;
    doc.setFontSize(8);
    doc.text(restaurant?.settings?.receiptFooter || 'Thank you for dining with us!', 105, y, { align: 'center' });

    doc.save(`Bill-${bill.billNumber}.pdf`);
  };

  const currency = restaurant?.currency || '₹';

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Billing, Payments & Invoices</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Generate official GST tax invoices, process payments, and print thermal POS receipts.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeBillData ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Left Side: Recent Bills Table */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Generated Invoices History</h3>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading bills from database...</div>
          ) : bills.length === 0 ? (
            <div className="empty-state">
              <Receipt size={36} className="empty-state-icon" />
              <h3>No bills generated yet</h3>
              <p>Bills will be generated automatically when orders are processed from the Live Orders dashboard.</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Order</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.billNumber}</td>
                      <td>Order #{b.orderId.substring(0, 6)}</td>
                      <td style={{ fontWeight: 600 }}>{currency}{b.grandTotal.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${b.paymentStatus === 'PAID' ? 'badge-ready' : 'badge-preparing'}`}>
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.paymentMethod}</td>
                      <td>
                        <button
                          onClick={() => loadSpecificOrderBill(b.orderId)}
                          className="btn btn-secondary btn-sm"
                        >
                          View Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Active Bill Preview & Printable Paper */}
        {activeBillData && (
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Tax Invoice Preview</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handlePrint} className="btn btn-secondary btn-sm" title="Print 80mm Receipt">
                  <Printer size={14} /> Print Bill
                </button>
                <button onClick={handleDownloadPDF} className="btn btn-secondary btn-sm" title="Download PDF">
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>

            {/* Printable Receipt Container */}
            <div
              id="printable-receipt"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                color: '#0f172a',
                lineHeight: 1.4,
              }}
            >
              {/* Restaurant Header */}
              <div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {restaurant?.name}
                </h2>
                <div>{restaurant?.address}</div>
                <div>Phone: {restaurant?.phone}</div>
                {restaurant?.gstNumber && <div>GSTIN: {restaurant?.gstNumber}</div>}
              </div>

              {/* Bill & Table Meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div><strong>Invoice:</strong> {activeBillData.bill.billNumber}</div>
                  <div><strong>Table:</strong> {activeBillData.order.table?.tableNumber}</div>
                  <div><strong>Guest:</strong> {activeBillData.order.customer?.name || 'Walk-in'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Date:</strong> {new Date(activeBillData.bill.createdAt).toLocaleDateString()}</div>
                  <div><strong>Time:</strong> {new Date(activeBillData.bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div><strong>Order:</strong> #{activeBillData.order.orderNumber}</div>
                </div>
              </div>

              {/* Line Items */}
              <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '0.5rem 0', margin: '0.5rem 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                      <th style={{ padding: '2px 0' }}>Item</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBillData.order.orderItems?.map((it) => (
                      <tr key={it.id}>
                        <td style={{ padding: '3px 0' }}>{it.name}</td>
                        <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{it.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{currency}{activeBillData.bill.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST/Tax ({restaurant?.taxPercentage}%):</span>
                  <span>{currency}{activeBillData.bill.tax.toFixed(2)}</span>
                </div>
                {activeBillData.bill.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Discount:</span>
                    <span>-{currency}{activeBillData.bill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '1rem',
                    borderTop: '1px solid #0f172a',
                    paddingTop: '4px',
                    marginTop: '4px',
                  }}
                >
                  <span>GRAND TOTAL:</span>
                  <span>{currency}{activeBillData.bill.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b' }}>
                <div>{restaurant?.settings?.receiptFooter || 'Thank you for dining with us! Please visit again.'}</div>
                <div style={{ marginTop: '4px', fontSize: '0.6875rem' }}>Powered by PlatePulse Restaurant POS</div>
              </div>
            </div>

            {/* Settle / Payment Controls */}
            {activeBillData.bill.paymentStatus !== 'PAID' && (
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Record Payment</h4>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    style={{ flex: 1 }}
                  >
                    <option value="CASH">Cash Payment</option>
                    <option value="UPI">UPI / QR Payment</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="ONLINE">Online Gateway</option>
                  </select>
                  <button onClick={handleProcessPayment} className="btn btn-success" style={{ fontWeight: 600 }}>
                    <CheckCircle size={16} /> Mark as Paid
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
