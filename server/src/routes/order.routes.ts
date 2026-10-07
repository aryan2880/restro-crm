import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { emitToRestaurant, emitToKitchen, emitToOrder } from '../socket/socketHandler';
import { OrderStatus, PaymentStatus, PaymentMethod, Role } from '@prisma/client';

const router = Router();

// POST /api/public/orders
// Customer places order from mobile QR menu
router.post('/public/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      restaurantSlug,
      tableNumber,
      customerName,
      customerPhone,
      customerEmail,
      items,
      specialInstructions,
      paymentMethod,
    } = req.body;

    if (!restaurantSlug || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Missing required order details.' });
      return;
    }

    if (!customerName || !customerPhone) {
      res.status(400).json({ error: 'Customer name and phone number are required.' });
      return;
    }

    // 1. Validate restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug.toLowerCase() },
      include: { settings: true },
    });

    if (!restaurant || restaurant.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Restaurant is currently inactive or unavailable.' });
      return;
    }

    // 2. Validate table belongs to this restaurant
    const table = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber: String(tableNumber).trim(),
        },
      },
    });

    if (!table || !table.isActive) {
      res.status(400).json({ error: `Table '${tableNumber}' does not exist or is inactive.` });
      return;
    }

    // 3. Validate menu items and check availability
    const itemIds = items.map((i: any) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        restaurantId: restaurant.id,
      },
    });

    if (dbMenuItems.length !== itemIds.length) {
      res.status(400).json({ error: 'One or more selected menu items could not be found.' });
      return;
    }

    // Strict OUT OF STOCK check:
    const outOfStockItems = dbMenuItems.filter((item) => !item.isAvailable);
    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map((i) => i.name).join(', ');
      res.status(400).json({
        error: `Cannot place order. The following items are OUT OF STOCK: ${names}. Please remove them to continue.`,
      });
      return;
    }

    // 4. Calculate pricing
    let subtotal = 0;
    const preparedOrderItems = items.map((itemReq: any) => {
      const dbItem = dbMenuItems.find((i) => i.id === itemReq.menuItemId)!;
      const qty = Math.max(1, parseInt(itemReq.quantity, 10) || 1);
      const itemTotal = Number((dbItem.price * qty).toFixed(2));
      subtotal += itemTotal;

      return {
        menuItemId: dbItem.id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: qty,
        specialInstructions: itemReq.specialInstructions?.trim() || null,
        total: itemTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    const taxRate = restaurant.taxPercentage / 100;
    const tax = Number((subtotal * taxRate).toFixed(2));
    const discount = 0.0;
    const total = Number((subtotal + tax - discount).toFixed(2));

    // 5. Database transaction for Order, Customer, OrderItems, History, Notification
    const newOrder = await prisma.$transaction(async (tx) => {
      // Find or create customer
      const cleanPhone = customerPhone.trim();
      const customer = await tx.customer.upsert({
        where: {
          restaurantId_phone: {
            restaurantId: restaurant.id,
            phone: cleanPhone,
          },
        },
        update: {
          name: customerName.trim(),
          ...(customerEmail && { email: customerEmail.trim() }),
        },
        create: {
          restaurantId: restaurant.id,
          name: customerName.trim(),
          phone: cleanPhone,
          email: customerEmail ? customerEmail.trim() : null,
        },
      });

      // Get sequential order number
      const lastOrder = await tx.order.findFirst({
        where: { restaurantId: restaurant.id },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });
      const nextOrderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;

      // Create Order
      const order = await tx.order.create({
        data: {
          orderNumber: nextOrderNumber,
          restaurantId: restaurant.id,
          branchId: table.branchId,
          tableId: table.id,
          customerId: customer.id,
          status: OrderStatus.NEW,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: (paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          subtotal,
          discount,
          tax,
          total,
          specialInstructions: specialInstructions?.trim() || null,
          orderItems: {
            create: preparedOrderItems,
          },
        },
        include: {
          orderItems: true,
          table: true,
          customer: true,
        },
      });

      // Record OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.NEW,
          note: `Order #${nextOrderNumber} placed by ${customerName} from Table ${table.tableNumber}`,
        },
      });

      // Create notification
      const notification = await tx.notification.create({
        data: {
          restaurantId: restaurant.id,
          type: 'NEW_ORDER',
          title: `New Order #${nextOrderNumber}`,
          message: `Table ${table.tableNumber} ordered ${items.length} items (Total: ${restaurant.currency}${total})`,
          data: JSON.stringify({ orderId: order.id, orderNumber: nextOrderNumber, table: table.tableNumber }),
        },
      });

      return { order, notification };
    });

    // 6. Real-time broadcast
    emitToRestaurant(restaurant.id, 'order:new', newOrder.order);
    emitToKitchen(restaurant.id, 'kitchen:new_order', newOrder.order);
    emitToRestaurant(restaurant.id, 'notification:new', newOrder.notification);

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId: newOrder.order.id,
      orderNumber: newOrder.order.orderNumber,
      status: newOrder.order.status,
      total: newOrder.order.total,
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to place order.' });
  }
});

// GET /api/orders
// Tenant list of orders with filters and pagination
router.get('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, tableId, search, date } = req.query;

    const where: any = {
      restaurantId: req.restaurantId,
    };

    if (status && status !== 'ALL') {
      where.status = status as OrderStatus;
    }

    if (tableId) {
      where.tableId = String(tableId);
    }

    if (date) {
      const startDate = new Date(String(date));
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(String(date));
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (search) {
      const searchStr = String(search).trim();
      const num = parseInt(searchStr.replace('#', ''), 10);
      where.OR = [
        ...(!isNaN(num) ? [{ orderNumber: num }] : []),
        { customer: { name: { contains: searchStr, mode: 'insensitive' } } },
        { customer: { phone: { contains: searchStr } } },
        { table: { tableNumber: { contains: searchStr, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: { select: { id: true, tableNumber: true } },
        customer: { select: { id: true, name: true, phone: true } },
        orderItems: true,
        bills: { select: { id: true, billNumber: true, paymentStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId: req.restaurantId,
      },
      include: {
        table: true,
        customer: true,
        orderItems: {
          include: {
            menuItem: { select: { isVeg: true, image: true } },
          },
        },
        statusHistory: {
          orderBy: { timestamp: 'asc' },
          include: {
            changedBy: { select: { name: true, role: true } },
          },
        },
        bills: true,
        payments: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve order details.' });
  }
});

// PATCH /api/orders/:id/status
// Transition order status: NEW -> PREPARING -> READY -> SERVED -> COMPLETED / CANCELLED
router.patch('/:id/status', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid order status transition provided.' });
      return;
    }

    const existingOrder = await prisma.order.findFirst({
      where: { id, restaurantId: req.restaurantId },
      include: { table: true, customer: true },
    });

    if (!existingOrder) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const targetStatus = status as OrderStatus;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: {
          status: targetStatus,
          ...(targetStatus === OrderStatus.COMPLETED && {
            paymentStatus: PaymentStatus.PAID,
          }),
        },
        include: {
          table: true,
          customer: true,
          orderItems: true,
          bills: true,
        },
      });

      // Record history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: targetStatus,
          changedById: req.user!.id,
          note: note || `Status updated to ${targetStatus} by ${req.user!.name} (${req.user!.role})`,
        },
      });

      // Create notification for certain states
      if ([OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(targetStatus)) {
        await tx.notification.create({
          data: {
            restaurantId: req.restaurantId!,
            type: `ORDER_${targetStatus}`,
            title: `Order #${order.orderNumber} ${targetStatus}`,
            message: `Table ${order.table.tableNumber} order marked as ${targetStatus}.`,
            data: JSON.stringify({ orderId: order.id, status: targetStatus }),
          },
        });
      }

      return order;
    });

    // Real-time broadcasts to restaurant, kitchen, and customer live tracking room
    const statusPayload = {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      tableNumber: updatedOrder.table.tableNumber,
      updatedAt: updatedOrder.updatedAt,
    };

    emitToRestaurant(req.restaurantId!, 'order:status_updated', statusPayload);
    emitToKitchen(req.restaurantId!, 'order:status_updated', statusPayload);
    emitToOrder(updatedOrder.id, 'order:status_updated', statusPayload);

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update order status.' });
  }
});

// GET /api/public/orders/:id/track
// Public customer tracking page endpoint
router.get('/public/track/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            name: true,
            logo: true,
            currency: true,
            phone: true,
            address: true,
            googleReviewUrl: true,
          },
        },
        table: { select: { tableNumber: true } },
        orderItems: true,
        statusHistory: {
          orderBy: { timestamp: 'asc' },
          select: {
            status: true,
            timestamp: true,
            note: true,
          },
        },
        reviews: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve order tracking information.' });
  }
});

export default router;
