import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { emitToRestaurant, emitToKitchen, emitToOrder } from '../socket/socketHandler';
import { OrderStatus, Role } from '@prisma/client';

const router = Router();

// GET /api/kds/orders
// Returns orders requiring kitchen attention (NEW and PREPARING, plus recently READY)
router.get(
  '/orders',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.KITCHEN_STAFF, Role.RESTAURANT_MANAGER, Role.RESTAURANT_OWNER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orders = await prisma.order.findMany({
        where: {
          restaurantId: req.restaurantId,
          status: {
            in: [OrderStatus.NEW, OrderStatus.PREPARING, OrderStatus.READY],
          },
        },
        include: {
          table: { select: { tableNumber: true } },
          orderItems: {
            include: {
              menuItem: { select: { isVeg: true, prepTimeMinutes: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' }, // Kitchen prioritizes oldest incoming orders
      });

      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve kitchen display orders.' });
    }
  }
);

// PATCH /api/kds/orders/:id/prepare
// Kitchen clicks START PREPARING
router.patch(
  '/orders/:id/prepare',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.KITCHEN_STAFF, Role.RESTAURANT_MANAGER, Role.RESTAURANT_OWNER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const order = await prisma.order.findFirst({
        where: { id, restaurantId: req.restaurantId },
        include: { table: true },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found in kitchen queue.' });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id },
          data: { status: OrderStatus.PREPARING },
          include: {
            table: true,
            orderItems: true,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            status: OrderStatus.PREPARING,
            changedById: req.user!.id,
            note: `Kitchen started preparation (${req.user!.name})`,
          },
        });

        return o;
      });

      const payload = {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        tableNumber: updated.table.tableNumber,
        updatedAt: updated.updatedAt,
      };

      emitToRestaurant(req.restaurantId!, 'order:status_updated', payload);
      emitToKitchen(req.restaurantId!, 'order:status_updated', payload);
      emitToOrder(updated.id, 'order:status_updated', payload);

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update order to preparing.' });
    }
  }
);

// PATCH /api/kds/orders/:id/ready
// Kitchen clicks MARK READY
router.patch(
  '/orders/:id/ready',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.KITCHEN_STAFF, Role.RESTAURANT_MANAGER, Role.RESTAURANT_OWNER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const order = await prisma.order.findFirst({
        where: { id, restaurantId: req.restaurantId },
        include: { table: true },
      });

      if (!order) {
        res.status(404).json({ error: 'Order not found in kitchen queue.' });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id },
          data: { status: OrderStatus.READY },
          include: {
            table: true,
            orderItems: true,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            status: OrderStatus.READY,
            changedById: req.user!.id,
            note: `Kitchen marked order ready for service (${req.user!.name})`,
          },
        });

        await tx.notification.create({
          data: {
            restaurantId: req.restaurantId!,
            type: 'ORDER_READY',
            title: `Order #${order.orderNumber} Ready!`,
            message: `Food for Table ${order.table.tableNumber} is ready for pickup/serving.`,
            data: JSON.stringify({ orderId: order.id, table: order.table.tableNumber }),
          },
        });

        return o;
      });

      const payload = {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        tableNumber: updated.table.tableNumber,
        updatedAt: updated.updatedAt,
      };

      emitToRestaurant(req.restaurantId!, 'order:status_updated', payload);
      emitToKitchen(req.restaurantId!, 'order:status_updated', payload);
      emitToOrder(updated.id, 'order:status_updated', payload);

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to mark order ready.' });
    }
  }
);

export default router;
