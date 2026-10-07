import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, Calendar, CreditCard, Users, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AnalyticsPage: React.FC = () => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [reports, setReports] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/analytics/reports');
      setReports(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch analytics reports.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    window.open('/api/analytics/export-csv', '_blank');
  };

  const currency = restaurant?.currency || '₹';

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Sales Analytics & Reports</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Accurate reports compiled from real database transactions and completed dining tickets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchReports} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleExportCSV} className="btn btn-primary btn-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading database reports...</div>
      ) : !reports ? (
        <div className="empty-state card">
          <BarChart3 size={40} className="empty-state-icon" />
          <h3>No sales data recorded yet</h3>
          <p>Reports will update dynamically as orders and payments are recorded.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Daily Sales Bar Representation */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>7-Day Daily Revenue</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem', alignItems: 'flex-end', minHeight: '180px' }}>
              {reports.dailySales?.map((day: any, idx: number) => {
                const maxSales = Math.max(...reports.dailySales.map((d: any) => d.sales), 100);
                const barHeight = Math.max(12, Math.round((day.sales / maxSales) * 130));
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>
                      {day.sales > 0 ? `${currency}${day.sales.toFixed(0)}` : '-'}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '48px',
                        height: `${barHeight}px`,
                        backgroundColor: day.sales > 0 ? '#0284c7' : '#e2e8f0',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', textAlign: 'center' }}>
                      {day.dayName}
                    </div>
                    <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                      {day.orders} order{day.orders === 1 ? '' : 's'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid: Payment Method Breakdown & Table Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Payment Method Breakdown */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Payment Methods Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(reports.paymentBreakdown || {}).map(([method, count]: [string, any]) => (
                  <div
                    key={method}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{method}</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>{count} transactions</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Performance */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Table Sales Performance</h3>
              {reports.tablePerformance?.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem' }}>
                  No table revenue yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {reports.tablePerformance?.map((tp: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div>
                        <strong>Table {tp.tableNumber}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '8px' }}>({tp.orders} orders)</span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#059669' }}>
                        {currency}{tp.revenue.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Retention Stats */}
          {reports.customerRetention && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Guest Retention & Loyalty</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Guests</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{reports.customerRetention.totalCustomers}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Repeat Guests (&gt; 1 order)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0284c7' }}>{reports.customerRetention.repeatCustomers}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Retention Rate</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>{reports.customerRetention.customerRetentionRate}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
