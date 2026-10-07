import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { emitToRestaurant } from '../socket/socketHandler';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/menu
router.get('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, available, search } = req.query;

    const where: any = {
      restaurantId: req.restaurantId,
    };

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (available !== undefined) {
      where.isAvailable = available === 'true';
    }

    if (search) {
      where.name = {
        contains: String(search),
        mode: 'insensitive',
      };
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
});

// POST /api/menu
router.post('/', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      categoryId,
      name,
      description,
      price,
      image,
      isVeg,
      prepTimeMinutes,
      isAvailable,
      isRecommended,
      taxPercentage,
      displayOrder,
    } = req.body;

    if (!categoryId || !name || price === undefined) {
      res.status(400).json({ error: 'Category, item name, and price are required.' });
      return;
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, restaurantId: req.restaurantId },
    });

    if (!category) {
      res.status(400).json({ error: 'Invalid category for this restaurant.' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: req.restaurantId!,
        categoryId,
        name: name.trim(),
        description: description?.trim() || null,
        price: Number(price),
        image: image || null,
        isVeg: Boolean(isVeg),
        prepTimeMinutes: Number(prepTimeMinutes) || 15,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        isRecommended: Boolean(isRecommended),
        taxPercentage: taxPercentage ? Number(taxPercentage) : null,
        displayOrder: Number(displayOrder) || 0,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create menu item.' });
  }
});

// PUT /api/menu/:id
router.put('/:id', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      name,
      description,
      price,
      image,
      isVeg,
      prepTimeMinutes,
      isAvailable,
      isRecommended,
      taxPercentage,
      displayOrder,
    } = req.body;

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(image !== undefined && { image }),
        ...(isVeg !== undefined && { isVeg: Boolean(isVeg) }),
        ...(prepTimeMinutes !== undefined && { prepTimeMinutes: Number(prepTimeMinutes) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(isRecommended !== undefined && { isRecommended: Boolean(isRecommended) }),
        ...(taxPercentage !== undefined && { taxPercentage: taxPercentage ? Number(taxPercentage) : null }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    // Notify listeners of change
    emitToRestaurant(req.restaurantId!, 'item:updated', updated);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
});

// PATCH /api/menu/:id/toggle-availability
// Instantly toggles AVAILABLE vs OUT OF STOCK
router.patch('/:id/toggle-availability', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.KITCHEN_STAFF, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }

    const newStatus = isAvailable !== undefined ? Boolean(isAvailable) : !existing.isAvailable;

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: newStatus },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    // Emit live event so customers and staff dashboards immediately update availability
    emitToRestaurant(req.restaurantId!, 'item:availability_updated', {
      itemId: updated.id,
      name: updated.name,
      isAvailable: updated.isAvailable,
    });

    // Record notification if turned out of stock
    if (!newStatus) {
      await prisma.notification.create({
        data: {
          restaurantId: req.restaurantId!,
          type: 'OUT_OF_STOCK',
          title: 'Item Marked Out of Stock',
          message: `${updated.name} has been marked Out of Stock.`,
          data: JSON.stringify({ itemId: updated.id, name: updated.name }),
        },
      });
      emitToRestaurant(req.restaurantId!, 'notification:new', {
        title: 'Item Marked Out of Stock',
        message: `${updated.name} has been marked Out of Stock.`,
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle item availability.' });
  }
});

// DELETE /api/menu/:id
router.delete('/:id', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }

    await prisma.menuItem.delete({ where: { id } });
    res.json({ message: 'Menu item deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
});

// GET /api/public/menu/:slug
// Customer scans QR -> fetches full menu for that restaurant slug
router.get('/public/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        currency: true,
        taxPercentage: true,
        openingHours: true,
        address: true,
        phone: true,
        status: true,
        settings: {
          select: {
            serviceChargePercent: true,
          },
        },
      },
    });

    if (!restaurant || restaurant.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Restaurant not found or currently inactive.' });
      return;
    }

    const categories = await prisma.category.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        menuItems: {
          orderBy: [
            { displayOrder: 'asc' },
            { name: 'asc' },
          ],
        },
      },
    });

    res.json({
      restaurant,
      categories,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load menu.' });
  }
});

export default router;
