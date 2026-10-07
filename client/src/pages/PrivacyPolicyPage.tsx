import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

export const PrivacyPolicyPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '2.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
            <Shield size={24} color="#0284c7" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Privacy Policy</h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>PlatePulse Multi-Tenant Restaurant Platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>1. Scope and Multi-Tenant Isolation</h2>
            <p>
              PlatePulse is committed to protecting data privacy. Our architecture enforces strict tenant isolation at the database layer. Restaurant tenant data, guest order details, and customer CRM profiles belonging to one restaurant are strictly isolated and never shared with or exposed to any other restaurant or third-party marketing entities.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>2. Information Collected</h2>
            <p>
              During digital QR ordering, we collect customer names and telephone numbers strictly for order fulfillment, digital billing, live kitchen updates, and optional guest loyalty tracking as requested by the dining establishment.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>3. Data Retention and Security</h2>
            <p>
              All passwords are encrypted using industry-standard salted hashing (bcrypt). Network communications are encrypted via HTTPS/TLS, and WebSocket sessions are authenticated and confined to designated tenant channels.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.375rem' }}>4. Google Reviews and Feedback</h2>
            <p>
              Customer feedback submitted through the platform is processed transparently. We never automatically submit Google reviews on behalf of any customer; all review actions require direct, conscious customer consent on the official Google platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
