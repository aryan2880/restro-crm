import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../utils/api';
import { MenuItem, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSocket } from '../utils/socket';

export const MenuAdminPage: React.FC = () => {
  const { restaurant } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Item Form State
  const [itemName, setItemName] = useState<string>('');
  const [itemCategoryId, setItemCategoryId] = useState<string>('');
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemImage, setItemImage] = useState<string>('');
  const [itemIsVeg, setItemIsVeg] = useState<boolean>(true);
  const [itemPrepTime, setItemPrepTime] = useState<number>(15);
  const [itemIsAvailable, setItemIsAvailable] = useState<boolean>(true);
  const [itemIsRecommended, setItemIsRecommended] = useState<boolean>(false);

  // Category Form State
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const [cats, items] = await Promise.all([
        api.get<Category[]>('/categories'),
        api.get<MenuItem[]>('/menu'),
      ]);
      setCategories(cats);
      setMenuItems(items);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch menu items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();

    const socket = getSocket();
    const handleAvailabilityUpdate = (payload: { itemId: string; isAvailable: boolean }) => {
      setMenuItems((prev) =>
        prev.map((i) => (i.id === payload.itemId ? { ...i, isAvailable: payload.isAvailable } : i))
      );
    };

    socket.on('item:availability_updated', handleAvailabilityUpdate);

    return () => {
      socket.off('item:availability_updated', handleAvailabilityUpdate);
    };
  }, []);

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const updated = await api.patch<MenuItem>(`/menu/${item.id}/toggle-availability`, {
        isAvailable: !item.isAvailable,
      });
      setMenuItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      showToast(
        `${item.name} is now marked ${updated.isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}`,
        updated.isAvailable ? 'success' : 'error'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle availability.', 'error');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemCategoryId || itemPrice <= 0) {
      showToast('Name, Category, and valid Price are required.', 'error');
      return;
    }

    try {
      const payload = {
        name: itemName.trim(),
        categoryId: itemCategoryId,
        price: Number(itemPrice),
        description: itemDescription.trim() || undefined,
        image: itemImage.trim() || undefined,
        isVeg: itemIsVeg,
        prepTimeMinutes: Number(itemPrepTime),
        isAvailable: itemIsAvailable,
        isRecommended: itemIsRecommended,
      };

      if (editingItem) {
        const updated = await api.put<MenuItem>(`/menu/${editingItem.id}`, payload);
        setMenuItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        showToast('Menu item updated successfully.', 'success');
      } else {
        const created = await api.post<MenuItem>('/menu', payload);
        setMenuItems((prev) => [...prev, created]);
        showToast('Menu item created successfully.', 'success');
      }

      setShowItemModal(false);
      resetItemForm();
    } catch (err: any) {
      showToast(err.message || 'Failed to save menu item.', 'error');
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      await api.delete(`/menu/${item.id}`);
      setMenuItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`${item.name} removed from menu.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete menu item.', 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const created = await api.post<Category>('/categories', {
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });
      setCategories((prev) => [...prev, created]);
      setNewCatName('');
      setNewCatDesc('');
      setShowCatModal(false);
      showToast(`Category '${created.name}' added.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create category.', 'error');
    }
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategoryId(categories[0]?.id || '');
    setItemPrice(0);
    setItemDescription('');
    setItemImage('');
    setItemIsVeg(true);
    setItemPrepTime(15);
    setItemIsAvailable(true);
    setItemIsRecommended(false);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategoryId(item.categoryId);
    setItemPrice(item.price);
    setItemDescription(item.description || '');
    setItemImage(item.image || '');
    setItemIsVeg(item.isVeg);
    setItemPrepTime(item.prepTimeMinutes);
    setItemIsAvailable(item.isAvailable);
    setItemIsRecommended(item.isRecommended);
    setShowItemModal(true);
  };

  const filteredItems = menuItems.filter((i) => {
    if (selectedCategory !== 'ALL' && i.categoryId !== selectedCategory) return false;
    if (availabilityFilter === 'AVAILABLE' && !i.isAvailable) return false;
    if (availabilityFilter === 'OUT_OF_STOCK' && i.isAvailable) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!i.name.toLowerCase().includes(s) && !i.description?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const currency = restaurant?.currency || '₹';

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Menu Management & Stock Availability</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Toggle item availability in real time to prevent customer orders of out-of-stock dishes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowCatModal(true)} className="btn btn-secondary">
            <Plus size={16} /> New Category
          </button>
          <button
            onClick={() => {
              resetItemForm();
              if (categories.length > 0) setItemCategoryId(categories[0].id);
              setShowItemModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search dishes by name or ingredient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '34px' }}
            />
          </div>

          {/* Availability filter */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'AVAILABLE', label: 'In Stock' },
              { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAvailabilityFilter(f.id)}
                className={`btn btn-sm ${availabilityFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Categories ({menuItems.length})
          </button>
          {categories.map((c) => {
            const count = menuItems.filter((i) => i.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`btn btn-sm ${selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading menu items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state card">
          <AlertCircle size={40} className="empty-state-icon" />
          <h3>No menu items found</h3>
          <p>Add food or beverage items to your menu to enable QR ordering.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                borderLeft: item.isAvailable ? '4px solid #10b981' : '4px solid #ef4444',
                opacity: item.isAvailable ? 1 : 0.85,
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '6px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`food-type-icon ${item.isVeg ? 'veg' : 'non-veg'}`} />
                    <h4
                      style={{
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </h4>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {item.category?.name || 'Category'}
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
                    {currency}{item.price.toFixed(2)}
                  </div>
                </div>
              </div>

              {item.description && (
                <p style={{ fontSize: '0.75rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </p>
              )}

              {/* Badges Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span className={`badge ${item.isAvailable ? 'badge-available' : 'badge-outofstock'}`}>
                    {item.isAvailable ? '✓ Available' : '✕ Out of Stock'}
                  </span>
                  {item.isRecommended && (
                    <span className="badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}>
                      <Sparkles size={10} /> Popular
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={12} /> {item.prepTimeMinutes}m
                </span>
              </div>

              {/* Actions Toolbar */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`btn btn-sm ${item.isAvailable ? 'btn-secondary' : 'btn-success'}`}
                  style={{ flex: 1 }}
                  title="Toggle stock availability immediately"
                >
                  {item.isAvailable ? <XCircle size={14} color="#ef4444" /> : <CheckCircle size={14} />}
                  <span>{item.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}</span>
                </button>
                <button onClick={() => openEditModal(item)} className="btn btn-secondary btn-sm" title="Edit Item">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDeleteItem(item)} className="btn btn-danger btn-sm" title="Delete Item">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Modal (Create/Edit) */}
      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label>Dish / Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Paneer Tikka Angara"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Category *</label>
                  <select
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <label>Description / Ingredients</label>
                <textarea
                  rows={2}
                  placeholder="Fresh cottage cheese with herbs..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
              </div>

              <div>
                <label>Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Food Classification</label>
                  <select
                    value={itemIsVeg ? 'VEG' : 'NON_VEG'}
                    onChange={(e) => setItemIsVeg(e.target.value === 'VEG')}
                  >
                    <option value="VEG">Vegetarian (Green)</option>
                    <option value="NON_VEG">Non-Vegetarian (Red)</option>
                  </select>
                </div>
                <div>
                  <label>Prep Time (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={itemPrepTime}
                    onChange={(e) => setItemPrepTime(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={itemIsAvailable}
                    onChange={(e) => setItemIsAvailable(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <span>In Stock (Available for ordering)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={itemIsRecommended}
                    onChange={(e) => setItemIsRecommended(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <span>Chef Recommendation</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowItemModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Create Menu Category</h3>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Starters, Main Course, Artisanal Pizzas"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Handcrafted gourmet bites..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowCatModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
