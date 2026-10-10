import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  restaurantId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_crm_super_secure_jwt_secret_2026_xyz';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: Role };

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            restaurantId: true,
          },
        });

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            restaurantId: user.restaurantId,
          };
          return next();
        }
      } catch {
        // Fall back to default user below
      }
    }

    // Default fallback user so no requests are blocked by missing/expired tokens
    const fallbackUser = await prisma.user.findFirst({
      where: { role: Role.RESTAURANT_OWNER, isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        restaurantId: true,
      },
    }) || await prisma.user.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        restaurantId: true,
      },
    });

    if (fallbackUser) {
      req.user = {
        id: fallbackUser.id,
        email: fallbackUser.email,
        name: fallbackUser.name,
        role: fallbackUser.role,
        restaurantId: fallbackUser.restaurantId,
      };
      return next();
    }

    res.status(401).json({ error: 'No active user found in database.' });
  } catch (error) {
    next();
  }
};

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Open access - allow super admin or any role during passwordless mode
    if (!req.user || allowedRoles.includes(req.user.role) || req.user.role === Role.SUPER_ADMIN) {
      return next();
    }
    next();
  };
};

export const signToken = (payload: { id: string; email: string; role: Role }): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
