import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/staff
router.get(
  '/',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.RESTAURANT_OWNER, Role.RESTAURANT_MANAGER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const staffMembers = await prisma.user.findMany({
        where: { restaurantId: req.restaurantId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          staffProfile: {
            include: { branch: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(staffMembers);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to retrieve staff members.' });
    }
  }
);

// POST /api/staff
router.post(
  '/',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, phone, role, branchId, roleTitle } = req.body;

      if (!email || !name || !role) {
        res.status(400).json({ error: 'Email, name, and role are required.' });
        return;
      }

      if (![Role.RESTAURANT_MANAGER, Role.KITCHEN_STAFF, Role.WAITER].includes(role)) {
        res.status(400).json({ error: 'Invalid staff role specified.' });
        return;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        res.status(409).json({ error: `User with email '${email}' already exists.` });
        return;
      }

      const passwordHash = await bcrypt.hash(password || 'nopassword', 10);

      const newStaff = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: email.toLowerCase().trim(),
            passwordHash,
            name: name.trim(),
            phone: phone?.trim() || null,
            role,
            restaurantId: req.restaurantId!,
            isActive: true,
          },
        });

        await tx.staff.create({
          data: {
            userId: user.id,
            branchId: branchId || null,
            roleTitle: roleTitle?.trim() || role.replace('_', ' '),
          },
        });

        return user;
      });

      res.status(201).json({
        id: newStaff.id,
        email: newStaff.email,
        name: newStaff.name,
        role: newStaff.role,
        phone: newStaff.phone,
        isActive: newStaff.isActive,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add staff member.' });
    }
  }
);

// PUT /api/staff/:id
router.put(
  '/:id',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, phone, role, isActive, roleTitle } = req.body;

      const target = await prisma.user.findFirst({
        where: { id, restaurantId: req.restaurantId },
      });

      if (!target) {
        res.status(404).json({ error: 'Staff member not found.' });
        return;
      }

      // Prevent deactivating own account
      if (req.user!.id === id && isActive === false) {
        res.status(400).json({ error: 'You cannot deactivate your own account.' });
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
          where: { id },
          data: {
            ...(name && { name: name.trim() }),
            ...(phone !== undefined && { phone }),
            ...(role && { role }),
            ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          },
        });

        if (roleTitle !== undefined) {
          await tx.staff.updateMany({
            where: { userId: id },
            data: { roleTitle: roleTitle.trim() },
          });
        }

        return u;
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update staff member.' });
    }
  }
);

// POST /api/staff/:id/reset-password
router.post(
  '/:id/reset-password',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      const target = await prisma.user.findFirst({
        where: { id, restaurantId: req.restaurantId },
      });

      if (!target) {
        res.status(404).json({ error: 'Staff member not found.' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      res.json({ message: `Password reset successfully for ${target.name}.` });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  }
);

// DELETE /api/staff/:id
router.delete(
  '/:id',
  authenticate,
  enforceTenant,
  authorizeRoles(Role.RESTAURANT_OWNER, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (req.user!.id === id) {
        res.status(400).json({ error: 'You cannot delete your own account.' });
        return;
      }

      const target = await prisma.user.findFirst({
        where: { id, restaurantId: req.restaurantId },
      });

      if (!target) {
        res.status(404).json({ error: 'Staff member not found.' });
        return;
      }

      await prisma.user.delete({ where: { id } });
      res.json({ message: 'Staff member deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete staff member.' });
    }
  }
);

export default router;
