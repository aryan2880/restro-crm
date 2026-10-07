import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC<{ onGoHome: () => void }> = ({ onGoHome }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <AlertCircle size={44} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>404 - Page Not Found</h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
          The requested page or restaurant URL could not be found. Please check the URL or return to home.
        </p>
        <button onClick={onGoHome} className="btn btn-primary" style={{ width: '100%' }}>
          <ArrowLeft size={16} /> Return to Home
        </button>
      </div>
    </div>
  );
};
