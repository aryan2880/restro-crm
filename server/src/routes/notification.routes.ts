import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { restaurantId: req.restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { restaurantId: req.restaurantId, isRead: false },
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notif = await prisma.notification.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!notif) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { restaurantId: req.restaurantId, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

export default router;
