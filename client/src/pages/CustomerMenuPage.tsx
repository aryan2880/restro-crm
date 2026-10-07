import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Clock,
  Sparkles,
  Plus,
  Minus,
  X,
  ChevronRight,
  AlertCircle,
  Utensils,
  CheckCircle,
} from 'lucide-react';
import { api } from '../utils/api';
import { Restaurant, Category, MenuItem, CartItem } from '../types';
import { useToast } from '../context/ToastContext';
import { getSocket } from '../utils/socket';

interface CustomerMenuPageProps {
  restaurantSlug: string;
  tableNumber: string;
  onOrderPlaced: (orderId: string) => void;
}

export const CustomerMenuPage: React.FC<CustomerMenuPageProps> = ({
  restaurantSlug,
  tableNumber,
  onOrderPlaced,
}) => {
  const { showToast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);

  // Item customization modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [itemNote, setItemNote] = useState<string>('');

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ restaurant: Restaurant; categories: (Category & { menuItems: MenuItem[] })[] }>(
        `/menu/public/${restaurantSlug}`
      );
      setRestaurant(data.restaurant);
      setCategories(data.categories);

      const allItems: MenuItem[] = [];
      data.categories.forEach((c) => {
        if (c.menuItems) {
          c.menuItems.forEach((i) => allItems.push({ ...i, category: { id: c.id, name: c.name } }));
        }
      });
      setMenuItems(allItems);
    } catch (err: any) {
      setError(err.message || 'Restaurant menu could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();

    const socket = getSocket();
    const handleAvailabilityUpdate = (payload: { itemId: string; isAvailable: boolean }) => {
      setMenuItems((prev) =>
        prev.map((i) => (i.id === payload.itemId ? { ...i, isAvailable: payload.isAvailable } : i))
      );
      // Remove from cart if it became out of stock
      if (!payload.isAvailable) {
        setCart((prev) => prev.filter((ci) => ci.menuItem.id !== payload.itemId));
      }
    };

    socket.on('item:availability_updated', handleAvailabilityUpdate);

    return () => {
      socket.off('item:availability_updated', handleAvailabilityUpdate);
    };
  }, [restaurantSlug]);

  const addToCart = (item: MenuItem, note?: string) => {
    if (!item.isAvailable) {
      showToast(`${item.name} is currently out of stock.`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItem.id === item.id
            ? { ...ci, quantity: ci.quantity + 1, specialInstructions: note || ci.specialInstructions }
            : ci
        );
      }
      return [...prev, { menuItem: item, quantity: 1, specialInstructions: note }];
    });

    setCustomizingItem(null);
    setItemNote('');
    showToast(`Added ${item.name} to cart`, 'success');
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.menuItem.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Please enter your name and phone number for the order.', 'error');
      return;
    }

    try {
      setSubmittingOrder(true);
      const res = await api.post<{ orderId: string; orderNumber: number }>('/orders/public/create', {
        restaurantSlug,
        tableNumber: tableNumber || 'T-01',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions,
        })),
        specialInstructions: specialInstructions.trim() || undefined,
        paymentMethod: 'CASH',
      });

      showToast(`Order #${res.orderNumber} placed successfully!`, 'success');
      setCart([]);
      setShowCartDrawer(false);
      onOrderPlaced(res.orderId);
    } catch (err: any) {
      showToast(err.message || 'Failed to place order.', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const totalItemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
  const taxRate = (restaurant?.taxPercentage || 5) / 100;
  const cartTax = cartSubtotal * taxRate;
  const cartGrandTotal = cartSubtotal + cartTax;

  const filteredItems = menuItems.filter((i) => {
    if (activeCategory !== 'ALL' && i.categoryId !== activeCategory) return false;
    if (vegOnly && !i.isVeg) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!i.name.toLowerCase().includes(s) && !i.description?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const currency = restaurant?.currency || '₹';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <Utensils size={32} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 1rem' }} />
          <div>Loading menu for Table {tableNumber}...</div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '1.5rem' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Menu Unavailable</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{error || 'Unable to load menu.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: totalItemsCount > 0 ? '80px' : '20px' }}>
      {/* Restaurant Header */}
      <header
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '1.25rem 1rem 1rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={20} />
              </div>
            )}
            <div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.2 }}>{restaurant.name}</h1>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dine-in Digital Menu</span>
            </div>
          </div>

          {/* Locked Table Badge */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              padding: '4px 10px',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Table</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#38bdf8' }}>{tableNumber || 'T-01'}</div>
          </div>
        </div>

        {/* Search & Veg Filter */}
        <div style={{ maxWidth: '720px', margin: '0.75rem auto 0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search dishes or beverages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '32px',
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                color: 'white',
                fontSize: '0.8125rem',
              }}
            />
          </div>
          <button
            onClick={() => setVegOnly(!vegOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: vegOnly ? '1px solid #16a34a' : '1px solid #334155',
              backgroundColor: vegOnly ? '#14532d' : '#1e293b',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="food-type-icon veg" />
            <span>Veg Only</span>
          </button>
        </div>
      </header>

      {/* Category Tabs */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.5rem 1rem',
          position: 'sticky',
          top: '112px',
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`btn btn-sm ${activeCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`btn btn-sm ${activeCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items List */}
      <main style={{ maxWidth: '720px', margin: '1rem auto', padding: '0 1rem' }}>
        {filteredItems.length === 0 ? (
          <div className="empty-state card">
            <AlertCircle size={36} className="empty-state-icon" />
            <h3>No matching dishes found</h3>
            <p>Try clearing your search or filters to see all available items.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filteredItems.map((item) => {
              const inCart = cart.find((ci) => ci.menuItem.id === item.id);
              const isOutOfStock = !item.isAvailable;

              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1rem',
                    opacity: isOutOfStock ? 0.6 : 1,
                    position: 'relative',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span className={`food-type-icon ${item.isVeg ? 'veg' : 'non-veg'}`} />
                      {item.isRecommended && (
                        <span style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Sparkles size={11} /> Bestseller
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      {item.name}
                    </h3>

                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0284c7', marginBottom: '6px' }}>
                      {currency}{item.price.toFixed(2)}
                    </div>

                    {item.description && (
                      <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, marginBottom: '6px' }}>
                        {item.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', color: '#94a3b8' }}>
                      <Clock size={11} />
                      <span>~{item.prepTimeMinutes} mins prep</span>
                    </div>
                  </div>

                  {/* Right: Item Image & Action Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', width: '100px', flexShrink: 0 }}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: '100px',
                          height: '80px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          marginBottom: '0.5rem',
                        }}
                      />
                    ) : (
                      <div style={{ width: '100px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginBottom: '0.5rem' }} />
                    )}

                    {isOutOfStock ? (
                      <span
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #fecaca',
                          textAlign: 'center',
                          width: '100%',
                        }}
                      >
                        OUT OF STOCK
                      </span>
                    ) : inCart ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          backgroundColor: '#0f172a',
                          color: 'white',
                          borderRadius: '6px',
                          padding: '2px 4px',
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{inCart.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCustomizingItem(item);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', fontWeight: 700, color: '#0284c7', borderColor: '#0284c7' }}
                      >
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemsCount > 0 && !showCartDrawer && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: 0,
            right: 0,
            padding: '0 1rem',
            zIndex: 50,
          }}
        >
          <div
            onClick={() => setShowCartDrawer(true)}
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              backgroundColor: '#0f172a',
              color: 'white',
              borderRadius: '12px',
              padding: '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#0284c7', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                <ShoppingBag size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                  {totalItemsCount} item{totalItemsCount === 1 ? '' : 's'} added
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Total: {currency}{cartGrandTotal.toFixed(2)} (incl. tax)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.875rem', color: '#38bdf8' }}>
              <span>View Cart</span>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      )}

      {/* Item Customization Modal (Instructions) */}
      {customizingItem && (
        <div className="modal-overlay" onClick={() => setCustomizingItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{customizingItem.name}</h3>
              <button onClick={() => setCustomizingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0284c7', marginBottom: '0.75rem' }}>
              {currency}{customizingItem.price.toFixed(2)}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label>Special Instructions / Preparation Note</label>
              <textarea
                rows={2}
                placeholder="e.g. Less spicy, no onions, extra crispy..."
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
              />
            </div>

            <button
              onClick={() => addToCart(customizingItem, itemNote)}
              className="btn btn-primary"
              style={{ width: '100%', fontWeight: 700, padding: '0.75rem' }}
            >
              Add to Order ({currency}{customizingItem.price.toFixed(2)})
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Drawer */}
      {showCartDrawer && (
        <div className="modal-overlay" onClick={() => setShowCartDrawer(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Your Dine-in Order</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Table: {tableNumber}</span>
              </div>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
              {cart.map((ci) => (
                <div
                  key={ci.menuItem.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0',
                    borderBottom: '1px dashed #e2e8f0',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ci.menuItem.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {currency}{ci.menuItem.price.toFixed(2)} each
                      {ci.specialInstructions && <span style={{ color: '#b45309' }}> • Note: {ci.specialInstructions}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '2px 6px',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(ci.menuItem.id, -1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{ci.quantity}</span>
                      <button
                        onClick={() => updateQuantity(ci.menuItem.id, 1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', width: '60px', textAlign: 'right' }}>
                      {currency}{(ci.menuItem.price * ci.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Details Form */}
            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Your Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label>Overall Table Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Please bring water glasses first"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              {/* Price Breakdown */}
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Subtotal:</span>
                  <span>{currency}{cartSubtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Tax/GST ({restaurant.taxPercentage}%):</span>
                  <span>{currency}{cartTax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                  <span>Total Amount:</span>
                  <span>{currency}{cartGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', fontWeight: 700 }}
              >
                {submittingOrder ? 'Placing Order...' : `Confirm & Place Order (${currency}${cartGrandTotal.toFixed(2)})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
