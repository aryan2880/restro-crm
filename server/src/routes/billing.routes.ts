import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { emitToRestaurant, emitToOrder } from '../socket/socketHandler';
import { PaymentStatus, PaymentMethod, OrderStatus, Role } from '@prisma/client';

const router = Router();

// POST /api/billing/:orderId/generate
// Generate a real bill for an order
router.post(
  '/:orderId/generate',
  authenticate,
  enforceTenant,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId: req.restaurantId },
        include: {
          restaurant: true,
          table: true,
          orderItems: true,
          bills: true,
        },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      // If bill already exists, return existing
      if (order.bills && order.bills.length > 0) {
        res.json(order.bills[0]);
        return;
      }

      const billCount = await prisma.bill.count({
        where: { restaurantId: req.restaurantId },
      });
      const year = new Date().getFullYear();
      const billNumber = `INV-${year}-${String(billCount + 1).padStart(4, '0')}`;

      const bill = await prisma.bill.create({
        data: {
          billNumber,
          orderId: order.id,
          restaurantId: req.restaurantId!,
          subtotal: order.subtotal,
          discount: order.discount,
          tax: order.tax,
          grandTotal: order.total,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
        },
      });

      res.status(201).json(bill);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate bill.' });
    }
  }
);

// GET /api/billing/:orderId
// Fetch complete bill details with order items, table, restaurant details
router.get(
  '/:orderId',
  authenticate,
  enforceTenant,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;

      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId: req.restaurantId },
        include: {
          restaurant: {
            select: {
              name: true,
              logo: true,
              address: true,
              phone: true,
              email: true,
              gstNumber: true,
              taxPercentage: true,
              currency: true,
              settings: true,
            },
          },
          table: true,
          customer: true,
          orderItems: true,
          bills: true,
          payments: true,
        },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      // Ensure bill exists or generate on-the-fly
      let bill = order.bills[0];
      if (!bill) {
        const billCount = await prisma.bill.count({
          where: { restaurantId: req.restaurantId },
        });
        const year = new Date().getFullYear();
        const billNumber = `INV-${year}-${String(billCount + 1).padStart(4, '0')}`;

        bill = await prisma.bill.create({
          data: {
            billNumber,
            orderId: order.id,
            restaurantId: req.restaurantId!,
            subtotal: order.subtotal,
            discount: order.discount,
            tax: order.tax,
            grandTotal: order.total,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
          },
        });
      }

      res.json({
        bill,
        order,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve bill.' });
    }
  }
);

// PATCH /api/billing/:orderId/pay
// Record payment against the order and bill
router.patch(
  '/:orderId/pay',
  authenticate,
  enforceTenant,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const { paymentMethod, transactionRef } = req.body;

      const method = (paymentMethod as PaymentMethod) || PaymentMethod.CASH;

      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId: req.restaurantId },
        include: { bills: true, table: true },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Record payment
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            restaurantId: req.restaurantId!,
            amount: order.total,
            method,
            status: PaymentStatus.PAID,
            transactionRef: transactionRef || null,
          },
        });

        // Update Order
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paymentMethod: method,
            ...(order.status === OrderStatus.SERVED && {
              status: OrderStatus.COMPLETED,
            }),
          },
        });

        // Update Bill
        await tx.bill.updateMany({
          where: { orderId: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paymentMethod: method,
            printedAt: new Date(),
          },
        });

        // History
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: updatedOrder.status,
            changedById: req.user!.id,
            note: `Payment of ${order.total} received via ${method} by ${req.user!.name}`,
          },
        });

        return { payment, updatedOrder };
      });

      emitToRestaurant(req.restaurantId!, 'payment:completed', {
        orderId: order.id,
        amount: order.total,
        method,
      });
      emitToOrder(order.id, 'order:status_updated', {
        orderId: order.id,
        status: result.updatedOrder.status,
        paymentStatus: PaymentStatus.PAID,
      });

      res.json({ message: 'Payment recorded successfully.', result });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to record payment.' });
    }
  }
);

// GET /api/billing
// List all bills for restaurant
router.get(
  '/',
  authenticate,
  enforceTenant,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentStatus } = req.query;

      const where: any = {
        restaurantId: req.restaurantId,
      };

      if (paymentStatus && paymentStatus !== 'ALL') {
        where.paymentStatus = paymentStatus as PaymentStatus;
      }

      const bills = await prisma.bill.findMany({
        where,
        include: {
          order: {
            include: {
              table: { select: { tableNumber: true } },
              customer: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(bills);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve bills list.' });
    }
  }
);

export default router;
