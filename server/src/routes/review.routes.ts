import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';

const router = Router();

// POST /api/public/reviews
// Customer submits feedback after dining
router.post('/public/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, restaurantSlug, rating, comment, customerName, customerPhone } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be a whole number between 1 and 5.' });
      return;
    }

    let restaurantId: string | null = null;

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, restaurantId: true, customer: true },
      });
      if (order) {
        restaurantId = order.restaurantId;
      }
    }

    if (!restaurantId && restaurantSlug) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug: restaurantSlug.toLowerCase() },
        select: { id: true },
      });
      if (restaurant) {
        restaurantId = restaurant.id;
      }
    }

    if (!restaurantId) {
      res.status(400).json({ error: 'Restaurant context could not be identified.' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        restaurantId,
        orderId: orderId || null,
        customerName: customerName?.trim() || 'Valued Guest',
        customerPhone: customerPhone?.trim() || null,
        rating: Math.round(rating),
        comment: comment?.trim() || null,
      },
    });

    res.status(201).json({
      message: 'Thank you for your genuine feedback!',
      review,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record feedback.' });
  }
});

// GET /api/reviews
// Restaurant owner/manager views customer feedback
router.get('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await prisma.review.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            table: { select: { tableNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    res.json({
      reviews,
      stats: {
        totalReviews,
        averageRating,
        ratingBreakdown: {
          5: reviews.filter((r) => r.rating === 5).length,
          4: reviews.filter((r) => r.rating === 4).length,
          3: reviews.filter((r) => r.rating === 3).length,
          2: reviews.filter((r) => r.rating === 2).length,
          1: reviews.filter((r) => r.rating === 1).length,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve reviews.' });
  }
});

export default router;
