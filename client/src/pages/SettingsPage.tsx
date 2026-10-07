import React, { useState, useEffect } from 'react';
import { Settings, Save, Store, Globe, MapPin, Phone, Mail, Clock, FileText } from 'lucide-react';
import { api } from '../utils/api';
import { Restaurant } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { restaurant, setRestaurant } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    coverImage: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    openingHours: '',
    gstNumber: '',
    taxPercentage: 5,
    currency: '₹',
    googleReviewUrl: '',
    description: '',
    customDomain: '',
    receiptFooter: '',
    enableKdsSound: true,
  });

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        logo: restaurant.logo || '',
        coverImage: restaurant.coverImage || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        website: restaurant.website || '',
        openingHours: restaurant.openingHours || '',
        gstNumber: restaurant.gstNumber || '',
        taxPercentage: restaurant.taxPercentage || 5,
        currency: restaurant.currency || '₹',
        googleReviewUrl: restaurant.googleReviewUrl || '',
        description: restaurant.description || '',
        customDomain: restaurant.customDomain || '',
        receiptFooter: restaurant.settings?.receiptFooter || '',
        enableKdsSound: restaurant.settings?.enableKdsSound ?? true,
      });
    }
  }, [restaurant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put<{ restaurant: Restaurant }>('/restaurant/me', formData);
      await api.put('/restaurant/settings', {
        receiptFooter: formData.receiptFooter,
        enableKdsSound: formData.enableKdsSound,
      });
      setRestaurant(res.restaurant);
      showToast('Restaurant profile and settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Restaurant Profile & Operations</h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          Configure business details, tax rates, Google Review redirect URL, and invoice settings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          Business Identity
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Restaurant Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Currency Symbol *</label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              placeholder="e.g. ₹, $, €, £"
              required
            />
          </div>
        </div>

        <div>
          <label>Restaurant Address *</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Contact Phone *</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Official Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>GST Number / Tax ID</label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              placeholder="e.g. 07AABCU9603R1ZX"
            />
          </div>
          <div>
            <label>Default Tax Percentage (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.taxPercentage}
              onChange={(e) => setFormData({ ...formData, taxPercentage: Number(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Logo Image URL</label>
            <input
              type="url"
              value={formData.logo}
              onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label>Cover Banner URL</label>
            <input
              type="url"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label>Google Business Profile / Review URL</label>
          <input
            type="url"
            value={formData.googleReviewUrl}
            onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
            placeholder="https://g.page/r/.../review"
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
            Prompted to happy guests (4 or 5 stars) after ordering to leave feedback on Google.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Opening Hours</label>
            <input
              type="text"
              value={formData.openingHours}
              onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
              placeholder="11:00 AM - 11:30 PM"
            />
          </div>
          <div>
            <label>Custom Domain Support</label>
            <input
              type="text"
              value={formData.customDomain}
              onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
              placeholder="menu.yourrestaurant.com"
            />
          </div>
        </div>

        <div>
          <label>Receipt Footer Note</label>
          <input
            type="text"
            value={formData.receiptFooter}
            onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
            placeholder="Thank you for dining with us! Please visit again."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ minWidth: '140px' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
