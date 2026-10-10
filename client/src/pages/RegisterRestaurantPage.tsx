import React, { useState } from 'react';
import { UtensilsCrossed, ArrowLeft, Building2, User, Lock, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User as UserType, Restaurant } from '../types';

interface RegisterRestaurantPageProps {
  onBackToLogin: () => void;
}

export const RegisterRestaurantPage: React.FC<RegisterRestaurantPageProps> = ({ onBackToLogin }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    restaurantName: '',
    slug: '',
    ownerName: '',
    email: '',
    website: '',
    phone: '',
    address: '',
    gstNumber: '',
    taxPercentage: 5,
    currency: '₹',
    openingHours: '11:00 AM - 11:00 PM',
    googleReviewUrl: '',
    description: '',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setFormData({
      ...formData,
      restaurantName: val,
      slug: val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{ token: string; user: UserType; restaurant: Restaurant }>('/auth/register-restaurant', {
        ...formData,
        taxPercentage: Number(formData.taxPercentage),
      });

      login(res.token, res.user, res.restaurant);
      showToast('Restaurant workspace created successfully! Welcome to PlatePulse.', 'success');
    } catch (err: any) {
      setError(err.message || 'Onboarding failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          maxWidth: '680px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        }}
      >
        <button
          onClick={onBackToLogin}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '1.25rem' }}
        >
          <ArrowLeft size={14} /> Back to Sign In
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a' }}>
            Register New Restaurant Workspace
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Launch your commercial QR ordering, KDS, and POS system in minutes.
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Restaurant Basic Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label>Restaurant Name *</label>
              <input
                type="text"
                placeholder="e.g. Copper Chimney Bistro"
                value={formData.restaurantName}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Unique URL Slug *</label>
              <input
                type="text"
                placeholder="copper-chimney"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label>Complete Address *</label>
            <input
              type="text"
              placeholder="Shop 5, Marina Promenade, Downtown"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label>Currency Symbol *</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="₹, $, €"
                required
              />
            </div>
            <div>
              <label>GST / Tax Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.taxPercentage}
                onChange={(e) => setFormData({ ...formData, taxPercentage: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Owner Credentials */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
              Owner Account Credentials
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label>Owner Full Name *</label>
                <input
                  type="text"
                  placeholder="Sunil Kumar"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginTop: '0.75rem' }}>
              <div>
                <label>Work Email Address *</label>
                <input
                  type="email"
                  placeholder="sunil@restaurant.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label>Website (Optional)</label>
                <input
                  type="url"
                  placeholder="https://myrestaurant.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', fontWeight: 700, marginTop: '0.75rem' }}
          >
            {loading ? 'Creating Workspace...' : 'Complete Registration & Launch'}
          </button>
        </form>
      </div>
    </div>
  );
};
