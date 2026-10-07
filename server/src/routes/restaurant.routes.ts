import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/restaurant/me
router.get('/me', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      include: {
        settings: true,
        subscription: true,
        branches: true,
      },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    res.json(restaurant);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch restaurant details.' });
  }
});

// PUT /api/restaurant/me
router.put('/me', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      logo,
      coverImage,
      address,
      phone,
      email,
      website,
      openingHours,
      gstNumber,
      taxPercentage,
      currency,
      googleReviewUrl,
      description,
      customDomain,
    } = req.body;

    const updated = await prisma.restaurant.update({
      where: { id: req.restaurantId },
      data: {
        ...(name && { name: name.trim() }),
        ...(logo !== undefined && { logo }),
        ...(coverImage !== undefined && { coverImage }),
        ...(address && { address: address.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(email && { email: email.toLowerCase().trim() }),
        ...(website !== undefined && { website }),
        ...(openingHours !== undefined && { openingHours }),
        ...(gstNumber !== undefined && { gstNumber }),
        ...(taxPercentage !== undefined && { taxPercentage: Number(taxPercentage) }),
        ...(currency !== undefined && { currency }),
        ...(googleReviewUrl !== undefined && { googleReviewUrl }),
        ...(description !== undefined && { description }),
        ...(customDomain !== undefined && { customDomain }),
      },
      include: {
        settings: true,
        subscription: true,
      },
    });

    res.json({ message: 'Restaurant settings updated successfully.', restaurant: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update restaurant settings.' });
  }
});

// GET /api/restaurant/settings
router.get('/settings', authenticate, enforceTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });
    res.json(settings || {});
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// PUT /api/restaurant/settings
router.put('/settings', authenticate, enforceTenant, authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN), async (req: Request, res: Response): Promise<void> => {
  try {
    const { enableKdsSound, serviceChargePercent, receiptFooter, autoAcceptOrders } = req.body;

    const updatedSettings = await prisma.restaurantSettings.upsert({
      where: { restaurantId: req.restaurantId! },
      update: {
        ...(enableKdsSound !== undefined && { enableKdsSound: Boolean(enableKdsSound) }),
        ...(serviceChargePercent !== undefined && { serviceChargePercent: Number(serviceChargePercent) }),
        ...(receiptFooter !== undefined && { receiptFooter: String(receiptFooter) }),
        ...(autoAcceptOrders !== undefined && { autoAcceptOrders: Boolean(autoAcceptOrders) }),
      },
      create: {
        restaurantId: req.restaurantId!,
        enableKdsSound: enableKdsSound !== undefined ? Boolean(enableKdsSound) : true,
        serviceChargePercent: Number(serviceChargePercent || 0),
        receiptFooter: String(receiptFooter || ''),
        autoAcceptOrders: Boolean(autoAcceptOrders || false),
      },
    });

    res.json({ message: 'Restaurant operational settings saved.', settings: updatedSettings });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// GET /api/public/restaurant/:slug
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
        coverImage: true,
        address: true,
        phone: true,
        email: true,
        openingHours: true,
        currency: true,
        taxPercentage: true,
        gstNumber: true,
        description: true,
        googleReviewUrl: true,
        status: true,
        settings: {
          select: {
            serviceChargePercent: true,
          },
        },
      },
    });

    if (!restaurant || restaurant.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Restaurant not found or currently unavailable.' });
      return;
    }

    res.json(restaurant);
  } catch (error: any) {
    res.status(500).json({ error: 'Error loading restaurant.' });
  }
});

export default router;
