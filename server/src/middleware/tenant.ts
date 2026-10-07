import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      restaurantId?: string;
    }
  }
}

export const enforceTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required for tenant context.' });
    return;
  }

  // Super admin can impersonate or inspect any restaurant if provided via header or query
  if (req.user.role === Role.SUPER_ADMIN) {
    const targetId = (req.headers['x-restaurant-id'] as string) || (req.query.restaurantId as string);
    if (targetId) {
      req.restaurantId = targetId;
    }
    next();
    return;
  }

  if (!req.user.restaurantId) {
    res.status(403).json({ error: 'User is not associated with any restaurant tenant.' });
    return;
  }

  // Enforce tenant isolation strictly
  req.restaurantId = req.user.restaurantId;
  next();
};
