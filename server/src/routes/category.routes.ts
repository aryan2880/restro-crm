import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/categories
router.get('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        _count: { select: { menuItems: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories
router.post('/', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, displayOrder } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const category = await prisma.category.create({
      data: {
        restaurantId: req.restaurantId!,
        name: name.trim(),
        description: description?.trim() || null,
        displayOrder: Number(displayOrder) || 0,
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, displayOrder, isActive } = req.body;

    const existing = await prisma.category.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findFirst({
      where: { id, restaurantId: req.restaurantId },
      include: { _count: { select: { menuItems: true } } },
    });

    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    if (existing._count.menuItems > 0) {
      res.status(400).json({ error: 'Cannot delete category containing menu items. Please remove or reassign items first.' });
      return;
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

export default router;
