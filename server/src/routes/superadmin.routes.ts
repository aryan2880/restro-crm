import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { Role, RestaurantStatus, SubscriptionPlan } from '@prisma/client';

const router = Router();

// Enforce Super Admin on all routes in this file
router.use(authenticate, authorizeRoles(Role.SUPER_ADMIN));

// GET /api/superadmin/analytics
// Real platform-wide metrics across all tenants
router.get('/analytics', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalRestaurants, activeRestaurants, totalUsers, totalOrders] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { status: RestaurantStatus.ACTIVE } }),
      prisma.user.count(),
      prisma.order.count(),
    ]);

    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      select: { total: true },
    });
    const platformRevenue = Number(paidOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2));

    const subscriptionCounts = await prisma.subscription.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });

    res.json({
      totalRestaurants,
      activeRestaurants,
      suspendedRestaurants: totalRestaurants - activeRestaurants,
      totalUsers,
      totalOrders,
      platformRevenue,
      subscriptionBreakdown: subscriptionCounts.reduce((acc, curr) => {
        acc[curr.plan] = curr._count.plan;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve superadmin analytics.' });
  }
});

// GET /api/superadmin/restaurants
router.get('/restaurants', async (_req: Request, res: Response): Promise<void> => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        subscription: true,
        _count: {
          select: {
            tables: true,
            orders: true,
            users: true,
          },
        },
        users: {
          where: { role: Role.RESTAURANT_OWNER },
          select: { name: true, email: true, phone: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      email: r.email,
      phone: r.phone,
      address: r.address,
      status: r.status,
      currency: r.currency,
      taxPercentage: r.taxPercentage,
      createdAt: r.createdAt,
      plan: r.subscription?.plan || 'STARTER',
      owner: r.users[0] || null,
      tableCount: r._count.tables,
      orderCount: r._count.orders,
      userCount: r._count.users,
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve restaurants list.' });
  }
});

// POST /api/superadmin/restaurants
router.post('/restaurants', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      email,
      phone,
      address,
      ownerName,
      ownerEmail,
      ownerPassword,
      plan,
      taxPercentage,
      currency,
    } = req.body;

    if (!name || !slug || !email || !ownerEmail || !ownerPassword) {
      res.status(400).json({ error: 'Name, slug, restaurant email, owner email, and password are required.' });
      return;
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const existingSlug = await prisma.restaurant.findUnique({ where: { slug: cleanSlug } });
    if (existingSlug) {
      res.status(409).json({ error: `Slug '${cleanSlug}' is already taken.` });
      return;
    }

    const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase().trim() } });
    if (existingOwner) {
      res.status(409).json({ error: `User with email '${ownerEmail}' already exists.` });
      return;
    }

    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: name.trim(),
          slug: cleanSlug,
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || '',
          address: address?.trim() || '',
          taxPercentage: taxPercentage ? Number(taxPercentage) : 5.0,
          currency: currency || '₹',
          status: RestaurantStatus.ACTIVE,
          settings: {
            create: {
              enableKdsSound: true,
              receiptFooter: `Thank you for dining with ${name}!`,
            },
          },
          subscription: {
            create: {
              plan: (plan as SubscriptionPlan) || SubscriptionPlan.PRO,
              status: 'ACTIVE',
              maxTables: 50,
              maxOrdersPerMonth: 5000,
            },
          },
        },
      });

      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Main Branch',
          isDefault: true,
        },
      });

      const owner = await tx.user.create({
        data: {
          email: ownerEmail.toLowerCase().trim(),
          passwordHash,
          name: ownerName?.trim() || 'Owner',
          phone: phone?.trim() || null,
          role: Role.RESTAURANT_OWNER,
          restaurantId: restaurant.id,
          isActive: true,
        },
      });

      await tx.staff.create({
        data: {
          userId: owner.id,
          branchId: branch.id,
          roleTitle: 'Proprietor',
        },
      });

      return { restaurant, owner };
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create restaurant.' });
  }
});

// PUT /api/superadmin/restaurants/:id/status
router.put('/restaurants/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(RestaurantStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid restaurant status.' });
      return;
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: { status },
    });

    res.json({ message: `Restaurant status updated to ${status}.`, restaurant: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update restaurant status.' });
  }
});

// DELETE /api/superadmin/restaurants/:id
router.delete('/restaurants/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    await prisma.restaurant.delete({ where: { id } });
    res.json({ message: `Restaurant '${restaurant.name}' deleted cleanly.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete restaurant.' });
  }
});

// GET /api/superadmin/users
router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        restaurant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const safeUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      restaurant: u.restaurant,
      createdAt: u.createdAt,
    }));

    res.json(safeUsers);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch platform users.' });
  }
});

export default router;
