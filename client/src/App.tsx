import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { TablesPage } from './pages/TablesPage';
import { MenuAdminPage } from './pages/MenuAdminPage';
import { KDSPage } from './pages/KDSPage';
import { FloorPage } from './pages/FloorPage';
import { BillingPage } from './pages/BillingPage';
import { CRMPage } from './pages/CRMPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StaffPage } from './pages/StaffPage';
import { SettingsPage } from './pages/SettingsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { CustomerMenuPage } from './pages/CustomerMenuPage';
import { CustomerTrackingPage } from './pages/CustomerTrackingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterRestaurantPage } from './pages/RegisterRestaurantPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { SupportPage } from './pages/SupportPage';
import { NotFoundPage } from './pages/NotFoundPage';

const AppContent: React.FC = () => {
  const { user, restaurant, isLoading } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeOrderIdForBill, setActiveOrderIdForBill] = useState<string | null>(null);
  const [enableSound, setEnableSound] = useState<boolean>(true);

  // URL Path router
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [searchParams, setSearchParams] = useState<URLSearchParams>(new URLSearchParams(window.location.search));

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0]);
    setSearchParams(new URLSearchParams(path.includes('?') ? path.split('?')[1] : ''));
  };

  // 1. Customer QR Menu Route: /menu/:slug?table=T-01
  if (currentPath.startsWith('/menu/')) {
    const slug = currentPath.replace('/menu/', '').trim();
    const tableNumber = searchParams.get('table') || 'T-01';

    return (
      <CustomerMenuPage
        restaurantSlug={slug}
        tableNumber={tableNumber}
        onOrderPlaced={(orderId) => {
          navigateTo(`/track/${orderId}`);
        }}
      />
    );
  }

  // 2. Customer Live Order Tracking Route: /track/:orderId
  if (currentPath.startsWith('/track/')) {
    const orderId = currentPath.replace('/track/', '').trim();
    return (
      <CustomerTrackingPage
        orderId={orderId}
        onBackToMenu={() => {
          window.history.back();
        }}
      />
    );
  }

  // 3. Legal & Public Pages
  if (currentPath === '/privacy') {
    return <PrivacyPolicyPage onBack={() => navigateTo('/login')} />;
  }
  if (currentPath === '/terms') {
    return <TermsPage onBack={() => navigateTo('/login')} />;
  }
  if (currentPath === '/support') {
    return <SupportPage onBack={() => navigateTo('/login')} />;
  }

  // 4. Registration Page
  if (currentPath === '/register') {
    return <RegisterRestaurantPage onBackToLogin={() => navigateTo('/login')} />;
  }

  // 5. Auth State Checking
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>PlatePulse</h2>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Loading secure platform workspace...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!user) {
    return (
      <LoginPage
        onNavigateRegister={() => navigateTo('/register')}
        onNavigatePrivacy={() => navigateTo('/privacy')}
        onNavigateTerms={() => navigateTo('/terms')}
        onNavigateSupport={() => navigateTo('/support')}
      />
    );
  }

  // Role Defaults: If kitchen staff, default to KDS
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isKitchen = user.role === 'KITCHEN_STAFF';

  const getPageTitle = (): { title: string; subtitle?: string } => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Live Orders & POS Overview', subtitle: 'Real-time kitchen and dining orders stream' };
      case 'tables':
        return { title: 'Table Management & QR Studio', subtitle: 'Table occupancy and downloadable QR codes' };
      case 'menu-admin':
        return { title: 'Menu Items & Stock Availability', subtitle: 'Dishes, categories and instant stock toggles' };
      case 'kds':
        return { title: 'Kitchen Display System (KDS)', subtitle: 'Real-time preparation line for chefs' };
      case 'floor':
        return { title: 'Floor & Waiter Service', subtitle: 'Ready dish pickups and table service alerts' };
      case 'billing':
        return { title: 'Billing & POS Invoices', subtitle: 'Tax invoice generation and payment settlement' };
      case 'crm':
        return { title: 'Customer CRM & Guest Loyalty', subtitle: 'Order history, lifetime spend, and favorites' };
      case 'analytics':
        return { title: 'Sales Analytics & Reports', subtitle: 'Database revenue reports and CSV exports' };
      case 'staff':
        return { title: 'Staff & Team Permissions', subtitle: 'Manage manager, kitchen, and waiter access' };
      case 'settings':
        return { title: 'Restaurant Settings', subtitle: 'Business identity, GST tax, and Google Review URLs' };
      case 'superadmin-overview':
      case 'superadmin-restaurants':
      case 'superadmin-users':
        return { title: 'Super Admin Platform Control', subtitle: 'Multi-tenant metrics and restaurant provisioning' };
      default:
        return { title: 'PlatePulse Platform' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={isKitchen && currentTab === 'dashboard' ? 'kds' : isSuperAdmin && currentTab === 'dashboard' ? 'superadmin-overview' : currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* Main App Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Top Header */}
        <Header
          title={title}
          subtitle={subtitle}
          enableSound={enableSound}
          setEnableSound={setEnableSound}
        />

        {/* Dynamic Page Views */}
        <main style={{ flex: 1 }}>
          {isSuperAdmin ? (
            <SuperAdminPage
              activeSubTab={
                currentTab === 'superadmin-restaurants'
                  ? 'restaurants'
                  : currentTab === 'superadmin-users'
                  ? 'users'
                  : 'overview'
              }
            />
          ) : isKitchen ? (
            currentTab === 'menu-admin' ? <MenuAdminPage /> : <KDSPage />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardPage
                  onOpenBill={(orderId) => {
                    setActiveOrderIdForBill(orderId);
                    setCurrentTab('billing');
                  }}
                />
              )}
              {currentTab === 'tables' && <TablesPage />}
              {currentTab === 'menu-admin' && <MenuAdminPage />}
              {currentTab === 'kds' && <KDSPage />}
              {currentTab === 'floor' && (
                <FloorPage
                  onOpenBill={(orderId) => {
                    setActiveOrderIdForBill(orderId);
                    setCurrentTab('billing');
                  }}
                />
              )}
              {currentTab === 'billing' && (
                <BillingPage
                  initialOrderId={activeOrderIdForBill}
                  onClearInitialOrder={() => setActiveOrderIdForBill(null)}
                />
              )}
              {currentTab === 'crm' && <CRMPage />}
              {currentTab === 'analytics' && <AnalyticsPage />}
              {currentTab === 'staff' && <StaffPage />}
              {currentTab === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
