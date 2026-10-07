import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Layers,
  ChefHat,
  Receipt,
  Users,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  ExternalLink,
  Shield,
  QrCode,
  ConciergeBell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, restaurant, logout } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isKitchen = user?.role === 'KITCHEN_STAFF';
  const isOwner = user?.role === 'RESTAURANT_OWNER';
  const isManager = user?.role === 'RESTAURANT_MANAGER';
  const isWaiter = user?.role === 'WAITER';

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #1e293b',
        flexShrink: 0,
      }}
    >
      {/* Brand & Workspace Info */}
      <div
        style={{
          padding: '1.25rem 1rem',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '1rem',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {restaurant?.logo ? (
            <img
              src={restaurant.logo}
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <UtensilsCrossed size={18} />
          )}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <h2
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#ffffff',
            }}
          >
            {isSuperAdmin ? 'Platform Admin' : restaurant?.name || 'PlatePulse'}
          </h2>
          <span
            style={{
              fontSize: '0.6875rem',
              color: '#94a3b8',
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {isSuperAdmin ? 'Super Administrator' : `${restaurant?.currency || '₹'} POS • ${user?.role.replace('_', ' ')}`}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {isSuperAdmin ? (
          <>
            <NavItem
              icon={<Shield size={18} />}
              label="Platform Overview"
              active={currentTab === 'superadmin-overview'}
              onClick={() => setCurrentTab('superadmin-overview')}
            />
            <NavItem
              icon={<UtensilsCrossed size={18} />}
              label="Restaurants"
              active={currentTab === 'superadmin-restaurants'}
              onClick={() => setCurrentTab('superadmin-restaurants')}
            />
            <NavItem
              icon={<UserCheck size={18} />}
              label="Platform Users"
              active={currentTab === 'superadmin-users'}
              onClick={() => setCurrentTab('superadmin-users')}
            />
          </>
        ) : isKitchen ? (
          <>
            <NavItem
              icon={<ChefHat size={18} />}
              label="Kitchen Display (KDS)"
              active={currentTab === 'kds'}
              onClick={() => setCurrentTab('kds')}
            />
            <NavItem
              icon={<Layers size={18} />}
              label="Menu Availability"
              active={currentTab === 'menu-admin'}
              onClick={() => setCurrentTab('menu-admin')}
            />
          </>
        ) : (
          <>
            <NavItem
              icon={<LayoutDashboard size={18} />}
              label="Live Orders"
              active={currentTab === 'dashboard'}
              onClick={() => setCurrentTab('dashboard')}
            />
            <NavItem
              icon={<ChefHat size={18} />}
              label="Kitchen Display (KDS)"
              active={currentTab === 'kds'}
              onClick={() => setCurrentTab('kds')}
            />
            <NavItem
              icon={<ConciergeBell size={18} />}
              label="Floor & Waiter"
              active={currentTab === 'floor'}
              onClick={() => setCurrentTab('floor')}
            />
            <NavItem
              icon={<QrCode size={18} />}
              label="Tables & QR Codes"
              active={currentTab === 'tables'}
              onClick={() => setCurrentTab('tables')}
            />
            <NavItem
              icon={<Layers size={18} />}
              label="Menu & Stock"
              active={currentTab === 'menu-admin'}
              onClick={() => setCurrentTab('menu-admin')}
            />
            <NavItem
              icon={<Receipt size={18} />}
              label="Billing & POS"
              active={currentTab === 'billing'}
              onClick={() => setCurrentTab('billing')}
            />
            {(isOwner || isManager) && (
              <>
                <NavItem
                  icon={<Users size={18} />}
                  label="Customer CRM"
                  active={currentTab === 'crm'}
                  onClick={() => setCurrentTab('crm')}
                />
                <NavItem
                  icon={<BarChart3 size={18} />}
                  label="Sales & Reports"
                  active={currentTab === 'analytics'}
                  onClick={() => setCurrentTab('analytics')}
                />
              </>
            )}
            {isOwner && (
              <>
                <NavItem
                  icon={<UserCheck size={18} />}
                  label="Staff Management"
                  active={currentTab === 'staff'}
                  onClick={() => setCurrentTab('staff')}
                />
                <NavItem
                  icon={<Settings size={18} />}
                  label="Settings"
                  active={currentTab === 'settings'}
                  onClick={() => setCurrentTab('settings')}
                />
              </>
            )}
          </>
        )}
      </nav>

      {/* Public QR Menu Launch Link */}
      {restaurant && !isSuperAdmin && (
        <div style={{ padding: '0.75rem', borderTop: '1px solid #1e293b' }}>
          <a
            href={`/menu/${restaurant.slug}?table=T-01`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#1e293b',
              borderRadius: '6px',
              color: '#38bdf8',
              fontSize: '0.8125rem',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <span>Preview QR Menu</span>
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* User Session Footnote */}
      <div
        style={{
          padding: '0.875rem 1rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user?.name}
          </p>
          <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{user?.email}</span>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.625rem 0.75rem',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: active ? '#1e293b' : 'transparent',
      color: active ? '#ffffff' : '#94a3b8',
      fontWeight: active ? 600 : 500,
      fontSize: '0.875rem',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.15s ease',
      borderLeft: active ? '3px solid #0284c7' : '3px solid transparent',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = '#1e293b';
        e.currentTarget.style.color = '#e2e8f0';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#94a3b8';
      }
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
);
