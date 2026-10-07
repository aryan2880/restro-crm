import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { authenticate, signToken } from '../middleware/auth';
import { Role, RestaurantStatus, SubscriptionPlan } from '@prisma/client';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        restaurant: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
      return;
    }

    // Check if restaurant is suspended
    if (user.restaurant && user.restaurant.status === RestaurantStatus.SUSPENDED) {
      res.status(403).json({ error: 'This restaurant workspace is currently suspended. Please contact platform support.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        restaurantId: user.restaurantId,
      },
      restaurant: user.restaurant,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// POST /api/auth/register-restaurant
router.post('/register-restaurant', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      restaurantName,
      slug,
      email,
      password,
      ownerName,
      phone,
      address,
      website,
      openingHours,
      gstNumber,
      taxPercentage,
      currency,
      googleReviewUrl,
      description,
      logo,
      coverImage,
    } = req.body;

    if (!restaurantName || !slug || !email || !password || !ownerName || !phone || !address) {
      res.status(400).json({ error: 'Missing mandatory fields for restaurant onboarding.' });
      return;
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    // Check if slug already exists
    const existingSlug = await prisma.restaurant.findUnique({
      where: { slug: cleanSlug },
    });
    if (existingSlug) {
      res.status(409).json({ error: `Restaurant slug '${cleanSlug}' is already taken. Please choose another.` });
      return;
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      res.status(409).json({ error: `Email address '${email}' is already registered.` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName.trim(),
          slug: cleanSlug,
          logo: logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop&q=80',
          coverImage: coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop&q=80',
          address: address.trim(),
          phone: phone.trim(),
          email: email.toLowerCase().trim(),
          website: website?.trim() || null,
          openingHours: openingHours?.trim() || '11:00 AM - 11:00 PM',
          gstNumber: gstNumber?.trim() || null,
          taxPercentage: typeof taxPercentage === 'number' ? taxPercentage : 5.0,
          currency: currency?.trim() || '₹',
          googleReviewUrl: googleReviewUrl?.trim() || null,
          description: description?.trim() || null,
          status: RestaurantStatus.ACTIVE,
          settings: {
            create: {
              enableKdsSound: true,
              serviceChargePercent: 0.0,
              receiptFooter: `Thank you for dining at ${restaurantName}! Please visit again.`,
              autoAcceptOrders: false,
            },
          },
          subscription: {
            create: {
              plan: SubscriptionPlan.PRO,
              status: 'ACTIVE',
              maxTables: 50,
              maxOrdersPerMonth: 5000,
            },
          },
        },
      });

      // 2. Create Default Branch
      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Main Dining Hall',
          address: address.trim(),
          phone: phone.trim(),
          isDefault: true,
        },
      });

      // 3. Create Default Tables (T-01, T-02, T-03)
      for (let i = 1; i <= 3; i++) {
        const tableNum = `T-0${i}`;
        await tx.table.create({
          data: {
            restaurantId: restaurant.id,
            branchId: branch.id,
            tableNumber: tableNum,
            capacity: 4,
            isActive: true,
            qrCodeUrl: `/menu/${cleanSlug}?table=${tableNum}`,
          },
        });
      }

      // 4. Create Owner User
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          name: ownerName.trim(),
          phone: phone.trim(),
          role: Role.RESTAURANT_OWNER,
          restaurantId: restaurant.id,
          isActive: true,
        },
      });

      // 5. Create Staff profile for owner
      await tx.staff.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          roleTitle: 'Proprietor & Owner',
        },
      });

      return { restaurant, user };
    });

    const token = signToken({
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    res.status(201).json({
      message: 'Restaurant successfully registered and workspace configured.',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        phone: result.user.phone,
        restaurantId: result.restaurant.id,
      },
      restaurant: result.restaurant,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Error occurred during restaurant registration.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        restaurant: {
          include: {
            settings: true,
            subscription: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        restaurantId: user.restaurantId,
      },
      restaurant: user.restaurant,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

export default router;
