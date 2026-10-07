import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';

const router = Router();

// GET /api/customers
// Fetch CRM customers with real aggregated metrics
router.get('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;

    const where: any = {
      restaurantId: req.restaurantId,
    };

    if (search) {
      const s = String(search).trim();
      const digits = s.replace(/[^0-9]/g, '');
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        ...(digits ? [{ phone: { contains: digits } }] : []),
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        orders: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
            orderItems: {
              select: { name: true, quantity: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = customers.map((c) => {
      const completedOrAllOrders = c.orders;
      const totalOrders = completedOrAllOrders.length;
      const totalSpent = completedOrAllOrders.reduce((sum, o) => sum + o.total, 0);
      const firstOrderDate = completedOrAllOrders.length > 0 ? completedOrAllOrders[completedOrAllOrders.length - 1].createdAt : null;
      const lastOrderDate = completedOrAllOrders.length > 0 ? completedOrAllOrders[0].createdAt : null;

      // Calculate favorite items
      const itemCounts: Record<string, number> = {};
      completedOrAllOrders.forEach((o) => {
        o.orderItems.forEach((oi) => {
          itemCounts[oi.name] = (itemCounts[oi.name] || 0) + oi.quantity;
        });
      });

      const favoriteItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        totalOrders,
        totalSpent: Number(totalSpent.toFixed(2)),
        averageSpend: totalOrders > 0 ? Number((totalSpent / totalOrders).toFixed(2)) : 0,
        firstOrderDate,
        lastOrderDate,
        favoriteItems,
        createdAt: c.createdAt,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve CRM customers.' });
  }
});

// GET /api/customers/:id
// Get customer profile with full order history
router.get('/:id', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, restaurantId: req.restaurantId },
      include: {
        orders: {
          include: {
            table: { select: { tableNumber: true } },
            orderItems: true,
            bills: { select: { billNumber: true, paymentStatus: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }

    const totalOrders = customer.orders.length;
    const totalSpent = customer.orders.reduce((sum, o) => sum + o.total, 0);

    const itemCounts: Record<string, number> = {};
    customer.orders.forEach((o) => {
      o.orderItems.forEach((oi) => {
        itemCounts[oi.name] = (itemCounts[oi.name] || 0) + oi.quantity;
      });
    });

    const favoriteItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      ...customer,
      totalOrders,
      totalSpent: Number(totalSpent.toFixed(2)),
      averageSpend: totalOrders > 0 ? Number((totalSpent / totalOrders).toFixed(2)) : 0,
      favoriteItems,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve customer details.' });
  }
});

export default router;
