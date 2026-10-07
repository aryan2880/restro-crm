import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { OrderStatus, PaymentStatus } from '@prisma/client';

const router = Router();

// GET /api/analytics/dashboard
// Real database metrics for Restaurant Dashboard
router.get('/dashboard', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.restaurantId!;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 1. Orders counts by status
    const [
      totalOrdersAllTime,
      todayOrdersCount,
      pendingOrdersCount,
      preparingOrdersCount,
      readyOrdersCount,
      completedOrdersCount,
      cancelledOrdersCount,
    ] = await Promise.all([
      prisma.order.count({ where: { restaurantId } }),
      prisma.order.count({ where: { restaurantId, createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { restaurantId, status: OrderStatus.NEW } }),
      prisma.order.count({ where: { restaurantId, status: OrderStatus.PREPARING } }),
      prisma.order.count({ where: { restaurantId, status: OrderStatus.READY } }),
      prisma.order.count({ where: { restaurantId, status: OrderStatus.COMPLETED } }),
      prisma.order.count({ where: { restaurantId, status: OrderStatus.CANCELLED } }),
    ]);

    // 2. Revenue aggregations
    const todayCompletedOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: todayStart },
        paymentStatus: PaymentStatus.PAID,
      },
      select: { total: true },
    });
    const todayRevenue = Number(todayCompletedOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2));

    const monthCompletedOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: monthStart },
        paymentStatus: PaymentStatus.PAID,
      },
      select: { total: true },
    });
    const monthlyRevenue = Number(monthCompletedOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2));

    const allPaidOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        paymentStatus: PaymentStatus.PAID,
      },
      select: { total: true },
    });
    const allPaidCount = allPaidOrders.length;
    const averageOrderValue = allPaidCount > 0
      ? Number((allPaidOrders.reduce((sum, o) => sum + o.total, 0) / allPaidCount).toFixed(2))
      : 0;

    // 3. Best-selling items (real DB aggregation)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { restaurantId, status: { not: OrderStatus.CANCELLED } },
      },
      select: {
        name: true,
        quantity: true,
        total: true,
      },
    });

    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orderItems.forEach((oi) => {
      if (!itemMap[oi.name]) {
        itemMap[oi.name] = { name: oi.name, quantity: 0, revenue: 0 };
      }
      itemMap[oi.name].quantity += oi.quantity;
      itemMap[oi.name].revenue += oi.total;
    });

    const bestSellingItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((i) => ({ ...i, revenue: Number(i.revenue.toFixed(2)) }));

    // 4. Active tables (currently occupied / having open orders)
    const activeTables = await prisma.table.count({
      where: {
        restaurantId,
        orders: {
          some: {
            status: { in: [OrderStatus.NEW, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED] },
          },
        },
      },
    });

    const totalTables = await prisma.table.count({
      where: { restaurantId, isActive: true },
    });

    res.json({
      metrics: {
        totalOrdersAllTime,
        todayOrdersCount,
        pendingOrdersCount,
        preparingOrdersCount,
        readyOrdersCount,
        completedOrdersCount,
        cancelledOrdersCount,
        todayRevenue,
        monthlyRevenue,
        averageOrderValue,
        activeTables,
        totalTables,
      },
      bestSellingItems,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to calculate analytics.' });
  }
});

// GET /api/analytics/reports
// Detailed charts and breakdown reports
router.get('/reports', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.restaurantId!;

    // 1. Last 7 days daily sales
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: sevenDaysAgo },
        status: { not: OrderStatus.CANCELLED },
      },
      select: {
        total: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        table: { select: { tableNumber: true } },
      },
    });

    // Group by Day (YYYY-MM-DD)
    const dailySalesMap: Record<string, { date: string; dayName: string; sales: number; orders: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dailySalesMap[key] = { date: key, dayName, sales: 0, orders: 0 };
    }

    recentOrders.forEach((o) => {
      const key = o.createdAt.toISOString().split('T')[0];
      if (dailySalesMap[key]) {
        dailySalesMap[key].orders += 1;
        if (o.paymentStatus === PaymentStatus.PAID) {
          dailySalesMap[key].sales += o.total;
        }
      }
    });

    const dailySales = Object.values(dailySalesMap).map((d) => ({
      ...d,
      sales: Number(d.sales.toFixed(2)),
    }));

    // 2. Payment Method Breakdown
    const paymentBreakdown: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      ONLINE: 0,
    };
    recentOrders.forEach((o) => {
      if (o.paymentMethod && paymentBreakdown[o.paymentMethod] !== undefined) {
        paymentBreakdown[o.paymentMethod] += 1;
      }
    });

    // 3. Table Performance
    const tablePerformanceMap: Record<string, { tableNumber: string; orders: number; revenue: number }> = {};
    recentOrders.forEach((o) => {
      const tNum = o.table.tableNumber;
      if (!tablePerformanceMap[tNum]) {
        tablePerformanceMap[tNum] = { tableNumber: tNum, orders: 0, revenue: 0 };
      }
      tablePerformanceMap[tNum].orders += 1;
      if (o.paymentStatus === PaymentStatus.PAID) {
        tablePerformanceMap[tNum].revenue += o.total;
      }
    });

    const tablePerformance = Object.values(tablePerformanceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((t) => ({ ...t, revenue: Number(t.revenue.toFixed(2)) }));

    // 4. Repeat Customers
    const customers = await prisma.customer.findMany({
      where: { restaurantId },
      include: { _count: { select: { orders: true } } },
    });
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((c) => c._count.orders > 1).length;
    const customerRetentionRate = totalCustomers > 0 ? Number(((repeatCustomers / totalCustomers) * 100).toFixed(1)) : 0;

    res.json({
      dailySales,
      paymentBreakdown,
      tablePerformance,
      customerRetention: {
        totalCustomers,
        repeatCustomers,
        customerRetentionRate,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve detailed reports.' });
  }
});

// GET /api/analytics/export-csv
// Export orders to CSV file
router.get('/export-csv', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        table: true,
        customer: true,
        orderItems: true,
        bills: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let csv = 'Order Number,Date,Table,Customer Name,Customer Phone,Items Count,Subtotal,Tax,Total,Status,Payment Method,Payment Status\n';

    orders.forEach((o) => {
      const date = o.createdAt.toISOString();
      const table = `"${o.table.tableNumber}"`;
      const custName = `"${o.customer?.name || 'Walk-in'}"`;
      const custPhone = `"${o.customer?.phone || '-'}"`;
      const itemsCount = o.orderItems.reduce((sum, i) => sum + i.quantity, 0);
      csv += `${o.orderNumber},${date},${table},${custName},${custPhone},${itemsCount},${o.subtotal},${o.tax},${o.total},${o.status},${o.paymentMethod},${o.paymentStatus}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-report-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

export default router;
