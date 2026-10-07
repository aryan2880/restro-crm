import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

export const TermsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '2.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <FileText size={24} color="#0f172a" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Terms and Conditions</h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>PlatePulse Restaurant SaaS Commercial Agreement</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>1. SaaS Platform Service</h2>
            <p>
              PlatePulse provides cloud restaurant operations infrastructure, including QR ordering menus, Kitchen Display Systems (KDS), point-of-sale invoice generation, and guest CRM tools. Restaurants agree to use the platform in compliance with applicable food safety, commercial, and local tax regulations.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>2. Pricing, Tax, and Billing Compliance</h2>
            <p>
              Restaurant operators are solely responsible for configuring accurate dish pricing, GST/VAT registrations, tax percentages, and receipt footers. PlatePulse provides computational automation based directly on operator inputs.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>3. Service Availability and Real-Time Systems</h2>
            <p>
              Real-time synchronization uses persistent WebSocket connections. In the event of temporary local connectivity interruptions, system state remains safely preserved within the persistent relational database.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
