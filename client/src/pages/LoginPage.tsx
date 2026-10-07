import React, { useState } from 'react';
import { UtensilsCrossed, Lock, Mail, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Restaurant } from '../types';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigatePrivacy: () => void;
  onNavigateTerms: () => void;
  onNavigateSupport: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateRegister,
  onNavigatePrivacy,
  onNavigateTerms,
  onNavigateSupport,
}) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState<string>('owner@grandbistro.com');
  const [password, setPassword] = useState<string>('Owner123!');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{ token: string; user: User; restaurant?: Restaurant }>('/auth/login', {
        email: email.trim(),
        password,
      });

      login(res.token, res.user, res.restaurant);
      showToast(`Welcome back, ${res.user.name}!`, 'success');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.5rem',
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          }}
        >
          {/* Brand Logo & Heading */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#0f172a',
                color: 'white',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
              }}
            >
              <UtensilsCrossed size={24} />
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a' }}>PlatePulse Platform</h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
              Restaurant QR Ordering, POS & Customer CRM SaaS
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '0.625rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Work Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  style={{ paddingLeft: '34px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label>Account Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: '34px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', fontWeight: 700, marginTop: '0.5rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Quick Test Credentials
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
              <button
                type="button"
                onClick={() => fillQuickLogin('owner@grandbistro.com', 'Owner123!')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
              >
                Grand Bistro (Owner)
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('kitchen@grandbistro.com', 'Kitchen123!')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
              >
                Kitchen Chef (KDS)
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('owner@tokyoramen.com', 'Owner123!')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
              >
                Tokyo Ramen (Tenant B)
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('admin@platepulse.com', 'AdminPassword123!')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
              >
                <Shield size={12} color="#0284c7" /> Super Admin
              </button>
            </div>
          </div>

          {/* Onboarding Link */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
            New restaurant business?{' '}
            <button
              onClick={onNavigateRegister}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              Onboard Your Restaurant
            </button>
          </div>
        </div>
      </div>

      {/* Footer Legal Links */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          fontSize: '0.75rem',
          color: '#64748b',
          paddingTop: '1rem',
        }}
      >
        <button onClick={onNavigatePrivacy} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          Privacy Policy
        </button>
        <button onClick={onNavigateTerms} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          Terms & Conditions
        </button>
        <button onClick={onNavigateSupport} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          Support & Help
        </button>
      </footer>
    </div>
  );
};
