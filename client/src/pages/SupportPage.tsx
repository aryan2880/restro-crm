import React from 'react';
import { ArrowLeft, Headphones, Mail, Phone, MessageSquare } from 'lucide-react';

export const SupportPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '2.5rem', border: '1px solid #e2e8f0' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: '8px' }}>
            <Headphones size={24} color="#047857" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Platform Support & Assistance</h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>PlatePulse Restaurant Operations Helpdesk</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Mail size={20} color="#0284c7" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Technical Support Desk</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>support@platepulse.com</div>
            </div>
          </div>

          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Phone size={20} color="#059669" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Commercial POS Hotline</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>+91 11 4000 8800 (10:00 AM - 11:00 PM IST)</div>
            </div>
          </div>

          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <MessageSquare size={20} color="#7c3aed" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Hardware & Thermal Printer Setup</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>ESC/POS USB, Ethernet, and Bluetooth pairing guidelines</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
