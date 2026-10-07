export type Role = 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'RESTAURANT_MANAGER' | 'KITCHEN_STAFF' | 'WAITER';

export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'ONLINE';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  restaurantId?: string | null;
}

export interface RestaurantSettings {
  id?: string;
  enableKdsSound: boolean;
  serviceChargePercent: number;
  receiptFooter?: string;
  autoAcceptOrders?: boolean;
}

export interface Subscription {
  id: string;
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  status: string;
  maxTables: number;
  maxOrdersPerMonth: number;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  coverImage?: string | null;
  address: string;
  phone: string;
  email: string;
  website?: string | null;
  openingHours?: string | null;
  gstNumber?: string | null;
  taxPercentage: number;
  currency: string;
  googleReviewUrl?: string | null;
  description?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  customDomain?: string | null;
  settings?: RestaurantSettings;
  subscription?: Subscription;
}

export interface Table {
  id: string;
  restaurantId: string;
  branchId?: string | null;
  tableNumber: string;
  capacity: number;
  isActive: boolean;
  isOccupied?: boolean;
  activeOrderCount?: number;
  currentOrder?: {
    id: string;
    orderNumber: number;
    status: OrderStatus;
    total: number;
    createdAt: string;
  } | null;
  qrCodeUrl?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: {
    menuItems: number;
  };
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  isVeg: boolean;
  prepTimeMinutes: number;
  isAvailable: boolean; // AVAILABLE vs OUT OF STOCK
  isRecommended: boolean;
  taxPercentage?: number | null;
  displayOrder: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string | null;
  total: number;
  menuItem?: {
    isVeg: boolean;
    image?: string | null;
    prepTimeMinutes?: number;
  };
}

export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  note?: string | null;
  timestamp: string;
  changedBy?: {
    name: string;
    role: Role;
  } | null;
}

export interface Order {
  id: string;
  orderNumber: number;
  restaurantId: string;
  branchId?: string | null;
  tableId: string;
  table: Table;
  customerId?: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  specialInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  bills?: {
    id: string;
    billNumber: string;
    paymentStatus: PaymentStatus;
  }[];
}

export interface Bill {
  id: string;
  billNumber: string;
  orderId: string;
  restaurantId: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  printedAt?: string | null;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  totalOrders: number;
  totalSpent: number;
  averageSpend: number;
  firstOrderDate?: string | null;
  lastOrderDate?: string | null;
  favoriteItems: string[];
  createdAt: string;
}

export interface Review {
  id: string;
  restaurantId: string;
  orderId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  rating: number;
  comment?: string | null;
  submittedGoogleReview: boolean;
  createdAt: string;
  order?: {
    orderNumber: number;
    total: number;
    table?: { tableNumber: string };
  };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardMetrics {
  totalOrdersAllTime: number;
  todayOrdersCount: number;
  pendingOrdersCount: number;
  preparingOrdersCount: number;
  readyOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  todayRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  activeTables: number;
  totalTables: number;
}
