import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/tables
router.get('/', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const tables = await prisma.table.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        branch: { select: { id: true, name: true } },
        orders: {
          where: {
            status: { in: ['NEW', 'PREPARING', 'READY', 'SERVED'] },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { tableNumber: 'asc' },
    });

    // Determine occupancy dynamically based on real active orders in database
    const mapped = tables.map((t) => ({
      ...t,
      isOccupied: t.orders.length > 0,
      activeOrderCount: t.orders.length,
      currentOrder: t.orders[0] || null,
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch restaurant tables.' });
  }
});

// POST /api/tables
router.post('/', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tableNumber, capacity, branchId } = req.body;

    if (!tableNumber) {
      res.status(400).json({ error: 'Table number/name is required.' });
      return;
    }

    const cleanNumber = String(tableNumber).trim();

    // Check duplicate
    const existing = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: req.restaurantId!,
          tableNumber: cleanNumber,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: `Table '${cleanNumber}' already exists in this restaurant.` });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { slug: true },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const qrCodeUrl = `/menu/${restaurant.slug}?table=${encodeURIComponent(cleanNumber)}`;

    const table = await prisma.table.create({
      data: {
        restaurantId: req.restaurantId!,
        branchId: branchId || null,
        tableNumber: cleanNumber,
        capacity: Number(capacity) || 4,
        isActive: true,
        qrCodeUrl,
      },
    });

    res.status(201).json(table);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create table.' });
  }
});

// PUT /api/tables/:id
router.put('/:id', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tableNumber, capacity, isActive } = req.body;

    const existing = await prisma.table.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Table not found in this restaurant.' });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { slug: true },
    });

    const newNumber = tableNumber ? String(tableNumber).trim() : existing.tableNumber;
    const qrCodeUrl = `/menu/${restaurant?.slug}?table=${encodeURIComponent(newNumber)}`;

    const updated = await prisma.table.update({
      where: { id },
      data: {
        tableNumber: newNumber,
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        qrCodeUrl,
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update table.' });
  }
});

// DELETE /api/tables/:id
router.delete('/:id', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.table.findFirst({
      where: { id, restaurantId: req.restaurantId },
      include: {
        orders: {
          where: { status: { in: ['NEW', 'PREPARING', 'READY', 'SERVED'] } },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Table not found.' });
      return;
    }

    if (existing.orders.length > 0) {
      res.status(400).json({ error: 'Cannot delete table with active active orders. Please complete or cancel orders first.' });
      return;
    }

    await prisma.table.delete({ where: { id } });
    res.json({ message: 'Table deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete table.' });
  }
});

// GET /api/tables/:id/qr-code
router.get('/:id/qr-code', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const table = await prisma.table.findFirst({
      where: { id, restaurantId: req.restaurantId },
      include: { restaurant: { select: { slug: true, name: true, logo: true } } },
    });

    if (!table) {
      res.status(404).json({ error: 'Table not found.' });
      return;
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fullUrl = `${protocol}://${host}/menu/${table.restaurant.slug}?table=${encodeURIComponent(table.tableNumber)}`;

    const qrDataUrl = await QRCode.toDataURL(fullUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    });

    res.json({
      tableNumber: table.tableNumber,
      restaurantName: table.restaurant.name,
      qrUrl: fullUrl,
      qrDataUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
});

export default router;
